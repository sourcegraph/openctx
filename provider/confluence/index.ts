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
    host: string
    port?: string
    username: string
    apiToken: string
}

type MentionData = {
    key: string
    url: string
}

const jiraProvider: Provider = {
    meta(params: MetaParams, settings: Settings): MetaResult {
        return { name: 'Confluence Pages', mentions: {} }
    },

    async mentions(params: MentionsParams, settings: Settings): Promise<MentionsResult> {
        return [
            {
                title: 'Engineering Ownership',
                description: 'Knowledge base',
                uri: 'https://openctx-provider-test.atlassian.net/wiki/spaces/KB/pages/851976/Engineering+Ownership',
            },
        ]
    },

    async items(params: ItemsParams, settings: Settings): Promise<ItemsResult> {
        return [
            {
                title: 'Engineering Ownership',
                url: 'https://openctx-provider-test.atlassian.net/wiki/spaces/KB/pages/851976/Engineering+Ownership',
                ui: {
                    hover: {
                        markdown: 'Knowledge base',
                        text: 'Knowledge base',
                    },
                },
                ai: {
                    content: 'Test',
                },
            },
        ]
    },
}

export default jiraProvider
