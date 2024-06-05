import type {
    ItemsParams,
    ItemsResult,
    MentionsParams,
    MentionsResult,
    MetaParams,
    MetaResult,
    Provider,
} from '@openctx/provider'
import { type Page, listPages } from './api.js'

export type Settings = {
    host: string
    port?: string
    email: string
    apiToken: string
}

const confluenceProvider: Provider = {
    meta(params: MetaParams, settings: Settings): MetaResult {
        return { name: 'Confluence Pages', mentions: {} }
    },

    async mentions(params: MentionsParams, settings: Settings): Promise<MentionsResult> {
        const spaces = await listPages(settings, params.query)
        return spaces.map(page => {
            return {
                title: page.title,
                uri: page.uri,
                description: page.space.name,
                ui: {
                    hover: {
                        text: page.title,
                    },
                },
                data: {
                    page: page,
                },
            }
        })
    },

    async items(params: ItemsParams, settings: Settings): Promise<ItemsResult> {
        const page = params.mention?.data?.page as Page

        if (!page) {
            return []
        }

        return [
            {
                title: `${page.title} (${page.space.name})`,
                url: page.uri,
                ai: {
                    content: 'The contents of the confluence page: ' + page.body,
                },
            },
        ]
    },
}

export default confluenceProvider
