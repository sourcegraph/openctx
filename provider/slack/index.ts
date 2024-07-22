import type {
    ItemsParams,
    ItemsResult,
    MentionsParams,
    MentionsResult,
    MetaResult,
} from '@openctx/provider'
import { SlackClient } from './client.js'

export type Settings = {
    slackAuthToken: string
}

let slackClient: undefined | SlackClient = undefined

const slackContext = {
    meta(): MetaResult {
        return { name: 'Slack', mentions: { label: 'Search by channel name...' } }
    },

    async initializeSlackClient(settingsInput: Settings) {
        if (slackClient === undefined) {
            slackClient = new SlackClient(settingsInput.slackAuthToken)
            await slackClient.initializeSlackData()
        }
    },

    async mentions(params: MentionsParams, settingsInput: Settings): Promise<MentionsResult> {
        await this.initializeSlackClient(settingsInput)
        if (!slackClient) {
            return []
        }
        const userQuery = params.query ?? ''
        const slackChannelList = slackClient.getChannelList()
        const channelIdList = slackChannelList.filter(channel => channel.name.includes(userQuery))
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
        await this.initializeSlackClient(settingsInput)
        if (!slackClient) {
            return []
        }
        const channelId = params.mention?.data?.channelId as string
        let message = params.message || ''
        const mentionPrefix = `@${params.mention?.data?.channelName}` || ''
        if (message.indexOf(mentionPrefix) !== -1) {
            message = message.slice(message.indexOf(mentionPrefix) + mentionPrefix.length)
        }
        const [recentContext, searchContext] = await Promise.all([
            slackClient.contextCandidatesFromRecentThreads(channelId),
            slackClient.contextCandidatesFromSearchApi(channelId, message),
        ])
        const allContext = [...recentContext, ...searchContext]
        return allContext
    },
}

export default slackContext
