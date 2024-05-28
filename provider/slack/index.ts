import type {
    ItemsParams,
    ItemsResult,
    MentionsParams,
    MentionsResult,
    MetaResult,
} from '@openctx/provider'
import { WebClient } from '@slack/web-api'
import type { Match } from '@slack/web-api/dist/types/response/SearchFilesResponse.js'

interface ChannelInfo {
    name: string
    id: string
    url: string
}

export type Settings = {
    slackAuthToken: string
}

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

// Function to search messages in a channel
async function searchInChannel(
    client: WebClient,
    channelId: string,
    query: string
): Promise<Match[] | undefined> {
    try {
        const result = await client.search.messages({ query: `in:<#${channelId}> ${query}`, count: 50 })
        return result?.messages?.matches
    } catch (error) {
        return undefined
    }
}

async function fetchThreadMessages(
    client: WebClient,
    channelId: string,
    threadTs: string
): Promise<string | null> {
    const allMessages = []
    try {
        let response = await client.conversations.replies({ channel: channelId, ts: threadTs })
        let messages = response.messages as any[]
        allMessages.push(...messages)
        while (response.has_more) {
            const nextCursor = response.response_metadata?.next_cursor
            response = await client.conversations.replies({
                channel: channelId,
                ts: threadTs,
                cursor: nextCursor,
            })
            messages = response.messages as any[]
            allMessages.push(...messages)
        }
        return allMessages?.map(msg => msg.text).join('\n\n')
    } catch (error) {
        return null
    }
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
        return { name: 'Slack', features: { mentions: true } }
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
                },
            })
        }
        return mentionRes
    },

    async items(params: ItemsParams, settingsInput: Settings): Promise<ItemsResult> {
        const client = getSlackClient(settingsInput)

        const channelId = params.mention?.data?.channelId as string
        if (channelId === undefined || channelId === null) {
            return []
        }
        let message = params.message || ''
        const mentionUrl = `@openctx:${params.mention?.uri}` || ''
        if (message.startsWith(mentionUrl)) {
            message = message.slice(mentionUrl.length)
        }
        // Slack api does not expose the `ts` property via the interface which is required to get the slack thread messages
        const searchResults = (await searchInChannel(client, channelId, message)) as any[]

        if (!searchResults) {
            return []
        }

        const NUM_SEARCH_RESULTS = 10
        if (searchResults.length > NUM_SEARCH_RESULTS) {
            searchResults.splice(NUM_SEARCH_RESULTS)
        }
        const allPromises = searchResults.map(async searchResult => {
            const threadTs = searchResult.ts as string
            const link = searchResult.permalink as string

            const threadMessage = await fetchThreadMessages(client, channelId, threadTs)
            const allMessages = `
                Here is a Slack conversation that may contain useful information for answering the user query. Please incorporate context from the Slack conversation only if it is directly relevant and provides sufficient information to address the question. If the Slack conversation is not relevant or lacks enough information, please disregard it.    

                ${threadMessage}
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
        return allSlackContext
    },
}

export default slackContext
