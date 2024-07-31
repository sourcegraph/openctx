import type { ItemsResult } from '@openctx/provider'
import { WebClient } from '@slack/web-api'
import type { MessageElement } from '@slack/web-api/dist/types/response/ConversationsHistoryResponse.js'
import type { Match } from '@slack/web-api/dist/types/response/SearchFilesResponse.js'
import dedent from 'dedent'
import { XMLBuilder } from 'fast-xml-parser'

const xmlBuilder = new XMLBuilder({ format: true })

interface ChannelInfo {
    name: string
    id: string
    url: string
}

export class SlackClient {
    private readonly client: WebClient
    public channelList: ChannelInfo[] = []
    public useridMapping: Map<string, string> = new Map()

    constructor(slackAuthToken: string) {
        this.client = new WebClient(slackAuthToken)
    }

    public getChannelList(): ChannelInfo[] {
        return this.channelList
    }

    public async contextCandidatesFromRecentThreads(
        channelId: string | undefined,
        limit = 10,
    ): Promise<ItemsResult> {
        if (!channelId) {
            return []
        }
        const conversations = await this.client.conversations.history({
            channel: channelId,
            limit,
        })
        const messages = conversations.messages || []
        messages.sort((a, b) => (b.ts ?? '').localeCompare(a.ts ?? ''))

        const allPromises = messages.map(async msg => {
            const threadTs = msg.ts
            if (threadTs === undefined) {
                return undefined
            }
            const threadConversation = await this.fetchThreadMessages(channelId, threadTs)
            // Basic checks to ensure some minimum conversation in the thread
            if (!threadConversation || threadConversation?.trim().length < 300) {
                return undefined
            }

            const slackInfo = xmlBuilder.build({
                timeStamp: msg.ts,
                conversation: threadConversation,
            })
            const allMessages = dedent`
                Here is a slack conversation that contains the recent conversation between the users and can help you provide context for answering the question.

                ${slackInfo}
            `

            if (allMessages) {
                return {
                    url: `https://slack.com/archives/${channelId}/p${threadTs}`,
                    title: channelId,
                    ai: { content: allMessages },
                }
            }
            return undefined
        })
        const allMessages = await Promise.all(allPromises)
        const recentConversationContext = []
        for (const message of allMessages) {
            if (message) {
                recentConversationContext.push(message)
            }
        }
        recentConversationContext.reverse()
        return recentConversationContext
    }

    public async contextCandidatesFromSearchApi(
        channelId: string | undefined,
        query: string,
        channelCandidatesLimit = 10,
        workspaceCandidatesLimit = 2,
    ): Promise<ItemsResult> {
        const searchResults = await this.getContextFromSlackSearchApi(
            channelId,
            query,
            channelCandidatesLimit,
            workspaceCandidatesLimit,
        )
        if (!searchResults) {
            return []
        }

        const allPromises = searchResults.map(async searchResult => {
            const link = searchResult.permalink
            const threadTs = this.extractThreadTs(link)
            const threadChannelId = this.extractChannelId(link)
            if (!threadTs || !threadChannelId) {
                return undefined
            }

            const threadMessage = await this.fetchThreadMessages(threadChannelId, threadTs)
            // Basic checks to ensure some minimum conversation in the thread
            if (!threadMessage || threadMessage?.trim().length < 300) {
                return undefined
            }

            const slackInfo = xmlBuilder.build({
                timeStamp: threadTs,
                conversation: threadMessage,
            })

            const allMessages = dedent`
                Here is a slack conversation that matches the search query of the user and can provide the relevant context for answering the question.

                ${slackInfo}
            `
            if (allMessages) {
                return {
                    url: link,
                    title: allMessages,
                    ai: { content: allMessages },
                }
            }
            return undefined
        })
        const allMessages = await Promise.all(allPromises)
        const allSlackContext = []
        for (const message of allMessages) {
            if (message) {
                allSlackContext.push(message)
            }
        }
        allSlackContext.reverse()
        return allSlackContext
    }

    private async getContextFromSlackSearchApi(
        channelId: string | undefined,
        query: string,
        channelLimit: number,
        workspaceLimit: number,
    ) {
        if (channelId) {
            const [channelSearchResults, workspaceSearchResults] = await Promise.all([
                this.searchQuery(`in:<#${channelId}> ${query}`, channelLimit),
                this.searchQuery(query, workspaceLimit),
            ])
            const searchResults = [...(channelSearchResults || []), ...(workspaceSearchResults || [])]
            return searchResults
        }
        const [searchResults] = await Promise.all([this.searchQuery(query, workspaceLimit)])
        return searchResults
    }

    // ----------- Helper function ---------------

    private async fetchThreadMessages(channelId: string, threadTs: string): Promise<string | null> {
        const allMessages: MessageElement[] = []
        try {
            let response = await this.client.conversations.replies({ channel: channelId, ts: threadTs })
            if (response.messages) {
                allMessages.push(...response.messages)
            }
            while (response.has_more) {
                const nextCursor = response.response_metadata?.next_cursor
                response = await this.client.conversations.replies({
                    channel: channelId,
                    ts: threadTs,
                    cursor: nextCursor,
                })
                if (response.messages) {
                    allMessages.push(...response.messages)
                }
            }
            return allMessages?.map(msg => this.getMessageInformation(msg)).join('\n\n')
        } catch (error) {
            return null
        }
    }

    private getMessageInformation(message: MessageElement) {
        const relatedInformation: string[] = []

        if (message.attachments) {
            for (const attachmentInfo of message.attachments) {
                const fileXML = xmlBuilder.build({
                    relatedInfo: attachmentInfo.text || '',
                })
                relatedInformation.push(fileXML)
            }
        }

        if (message.files) {
            for (const attachmentInfo of message.files) {
                const fileXML = xmlBuilder.build({
                    relatedInfo: attachmentInfo.title || '',
                })
                relatedInformation.push(fileXML)
            }
        }

        const allRelatedInformation = relatedInformation.join('\n')
        const messageInfo = xmlBuilder.build({
            user: this.getUserNameFromSlackId(message.user || ''),
            message: this.resolveUserIdForMessage(message.text || ''),
            allRelatedInformation: allRelatedInformation,
        })
        return messageInfo
    }

    private resolveUserIdForMessage(message: string): string {
        const userIdRegex = /<@(\w+)>/g
        return message.replace(userIdRegex, (match, userId) => {
            const username = this.useridMapping.get(userId)
            return username ? `@${username}` : match
        })
    }

    private getUserNameFromSlackId(slackId: string): string {
        return this.useridMapping.get(slackId) || slackId
    }

    private async searchQuery(query: string, numResults = 5): Promise<Match[] | undefined> {
        try {
            const result = await this.client.search.messages({ query: query, count: numResults })
            return result?.messages?.matches
        } catch (error) {
            return undefined
        }
    }

    private extractThreadTs(permalink: string | undefined): string | null {
        if (!permalink) {
            return null
        }
        const url = new URL(permalink)
        const queryParams = new URLSearchParams(url.search)
        const threadTs = queryParams.get('thread_ts')
        return threadTs
    }

    private extractChannelId(slackUrl: string | undefined): string | null {
        if (!slackUrl) {
            return null
        }
        const pattern = /archives\/([A-Z0-9]+)\//
        const match = slackUrl.match(pattern)
        if (match) {
            return match[1]
        }
        return null
    }

    // ----------- Initialization function ---------------

    public async initializeSlackData() {
        await Promise.all([this.initializeAllChannels(), this.initializeUseridMapping()])
    }

    // Initialize the userid mapping from the slack user list
    private async initializeUseridMapping() {
        let nextCursor: string | undefined = undefined
        do {
            const response = await this.client.users.list({
                limit: 1000,
                cursor: nextCursor,
            })
            const userList = response.members ?? []
            for (const user of userList) {
                if (user.id && (user.profile?.display_name || user.profile?.real_name)) {
                    this.useridMapping.set(
                        user.id,
                        user.profile?.real_name || user.profile?.display_name || '',
                    )
                }
            }
            nextCursor = response.response_metadata?.next_cursor
        } while (nextCursor)
    }

    // Initialize the channel list from the slack channel list
    private async initializeAllChannels() {
        let allChannels: ChannelInfo[] = []
        let cursor: string | undefined
        do {
            const response = await this.client.conversations.list({
                exclude_archived: true,
                limit: 1000,
                cursor: cursor,
            })

            if (response.channels) {
                const channelInfo = response.channels.map(channel => ({
                    name: channel.name || '',
                    id: channel.id || '',
                    url: `https://slack.com/archives/${channel.id}`,
                }))
                allChannels = [...allChannels, ...channelInfo]
            }
            cursor = response.response_metadata?.next_cursor
        } while (cursor)
        this.channelList = allChannels
    }
}
