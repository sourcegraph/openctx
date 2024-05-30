import type {
    ItemsParams,
    ItemsResult,
    MentionsParams,
    MentionsResult,
    MetaResult,
} from '@openctx/provider'
import { WebClient } from '@slack/web-api'
import type { MessageElement } from '@slack/web-api/dist/types/response/ConversationsHistoryResponse.js'
import type { Match } from '@slack/web-api/dist/types/response/SearchFilesResponse.js'
import dedent from 'dedent'
import { XMLBuilder } from 'fast-xml-parser'

interface ChannelInfo {
    name: string
    id: string
    url: string
}

export type Settings = {
    slackAuthToken: string
}

const xmlBuilder = new XMLBuilder({ format: true })

function getSlackClient(settingsInput: Settings) {
    if (settingsInput.slackAuthToken) {
        const slackWebClient = new WebClient(settingsInput.slackAuthToken)
        return slackWebClient
    }
    throw new Error('must provide a Slack user auth token in the `slackAuthToken` user settings field')
}

async function listAllChannels(client: WebClient): Promise<ChannelInfo[]> {
    let allChannels: ChannelInfo[] = []
    let cursor: string | undefined
    do {
        const response = await client.conversations.list({
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
    return allChannels
}

function getMessageInformation(message: MessageElement) {
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
        message: message.text || '',
        allRelatedInformation: allRelatedInformation,
    })
    return messageInfo
}

async function fetchThreadMessages(
    client: WebClient,
    channelId: string,
    threadTs: string
): Promise<string | null> {
    const allMessages: MessageElement[] = []
    try {
        let response = await client.conversations.replies({ channel: channelId, ts: threadTs })
        if (response.messages) {
            allMessages.push(...response.messages)
        }
        while (response.has_more) {
            const nextCursor = response.response_metadata?.next_cursor
            response = await client.conversations.replies({
                channel: channelId,
                ts: threadTs,
                cursor: nextCursor,
            })
            if (response.messages) {
                allMessages.push(...response.messages)
            }
        }
        return allMessages?.map(msg => getMessageInformation(msg)).join('\n\n')
    } catch (error) {
        return null
    }
}

function extractThreadTs(permalink: string | undefined): string | null {
    if (!permalink) {
        return null
    }
    const url = new URL(permalink)
    const queryParams = new URLSearchParams(url.search)
    const threadTs = queryParams.get('thread_ts')
    return threadTs
}

function extractChannelId(slackUrl: string | undefined): string | null {
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

// Function to search messages using slack api
async function searchQuery(
    client: WebClient,
    query: string,
    numResults = 5
): Promise<Match[] | undefined> {
    try {
        const result = await client.search.messages({ query: query, count: numResults })
        return result?.messages?.matches
    } catch (error) {
        return undefined
    }
}

async function getContextFromSlackSearchApi(
    client: WebClient,
    channelId: string | undefined,
    query: string,
    channelLimit = 50,
    workspaceLimit = 50
) {
    if (channelId) {
        const [channelSearchResults, workspaceSearchResults] = await Promise.all([
            searchQuery(client, `in:<#${channelId}> ${query}`, channelLimit),
            searchQuery(client, query, workspaceLimit),
        ])
        const searchResults = [...(channelSearchResults || []), ...(workspaceSearchResults || [])]
        return searchResults
    }
    const [searchResults] = await Promise.all([searchQuery(client, query, workspaceLimit)])
    return searchResults
}

async function searchContextCandidates(
    client: WebClient,
    channelId: string | undefined,
    query: string,
    channelLimit = 10,
    workspaceLimit = 2
): Promise<ItemsResult> {
    const searchResults = await getContextFromSlackSearchApi(
        client,
        channelId,
        query,
        channelLimit,
        workspaceLimit
    )
    if (!searchResults) {
        return []
    }

    const allPromises = searchResults.map(async searchResult => {
        const link = searchResult.permalink
        const threadTs = extractThreadTs(link)
        const threadChannelId = extractChannelId(link)
        if (!threadTs || !threadChannelId) {
            return undefined
        }

        const threadMessage = await fetchThreadMessages(client, threadChannelId, threadTs)
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

async function recentThreadsContextCandidates(
    client: WebClient,
    channelId: string | undefined,
    limit = 10
): Promise<ItemsResult> {
    if (!channelId) {
        return []
    }
    const conversations = await client.conversations.history({
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
        const threadConversation = await fetchThreadMessages(client, channelId, threadTs)
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

interface SlackChannelData {
    isInitialized: boolean
    channelList: ChannelInfo[]
}

let slackChannelData: SlackChannelData = {
    isInitialized: false,
    channelList: [],
}

const slackContext = {
    meta(): MetaResult {
        return { name: 'Slack', mentions: {} }
    },

    async initializeChannelList(settingsInput: Settings) {
        if (slackChannelData.isInitialized === false) {
            const client = getSlackClient(settingsInput)
            const channelList = await listAllChannels(client)
            slackChannelData = {
                isInitialized: true,
                channelList: channelList,
            }
        }
    },

    async mentions(params: MentionsParams, settingsInput: Settings): Promise<MentionsResult> {
        await this.initializeChannelList(settingsInput)
        const userQuery = params.query ?? ''
        const channelIdList = slackChannelData.channelList.filter(channel =>
            channel.name.includes(userQuery)
        )
        if (!channelIdList) {
            return []
        }
        const mentionRes: MentionsResult = []
        for (const channel of channelIdList) {
            mentionRes.push({
                title: channel.name,
                uri: channel.url,
                data: {
                    channelId: channel.id,
                    channelName: channel.name,
                },
            })
        }
        return mentionRes
    },

    async items(params: ItemsParams, settingsInput: Settings): Promise<ItemsResult> {
        const client = getSlackClient(settingsInput)
        const channelId = params.mention?.data?.channelId as string

        let message = params.message || ''
        const mentionUrl = `@openctx:${params.mention?.uri}` || ''
        if (message.startsWith(mentionUrl)) {
            message = message.slice(mentionUrl.length)
        }
        const [recentContext, searchContext ] = await Promise.all([
            recentThreadsContextCandidates(client, channelId),
            searchContextCandidates(client, channelId, message),
        ])
        const allContext = [...recentContext, ...searchContext]
        return allContext
    },
}

export default slackContext
