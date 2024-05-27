import type {
    ItemsParams,
    ItemsResult,
    MentionsParams,
    MentionsResult,
    MetaParams,
    MetaResult,
    Provider,
} from '@openctx/provider'

export type Settings = {
    endpoint?: string
    username?: string
    apiToken?: string
}

const jiraProvider: Provider = {
    meta(params: MetaParams, settings: Settings): MetaResult {
        return { name: 'Jira', features: { mentions: true } }
    },

    async mentions(params: MentionsParams, settings: Settings): Promise<MentionsResult> {
        if (!params.query) {
            return []
        }

        const jiraMentions = [
            {
                title: 'JIRA-123',
                url: 'https://jira.openctx.org/browse/JIRA-123',
                content: 'JIRA-123',
            },
            {
                title: 'JIRA-456',
                url: 'https://jira.openctx.org/browse/JIRA-456',
                content: 'JIRA-456',
            },
            {
                title: 'JIRA-789',
                url: 'https://jira.openctx.org/browse/JIRA-789',
                content: 'JIRA-789',
            },
        ]

        return jiraMentions.map(mention => ({
            title: mention.title,
            uri: mention.url,
            data: { content: mention.content },
        }))
    },

    items(params: ItemsParams, settings: Settings): ItemsResult {
        return [
            {
                title: params.mention?.title || '',
                url: params.mention?.uri || '',
                ai: {
                    content: 'asd',
                },
            },
        ]
    },
}

export default jiraProvider
