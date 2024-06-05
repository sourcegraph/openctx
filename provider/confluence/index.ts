import type {
    ItemsParams,
    ItemsResult,
    MentionsParams,
    MentionsResult,
    MetaParams,
    MetaResult,
    Provider,
} from '@openctx/provider'
import { getPage, listPages } from './api.js'

export type Settings = {
    url: string
    email: string
    apiToken: string
}

type PageData = {
    id: string
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
                    page: {
                        id: page.id,
                    },
                },
            }
        })
    },

    async items(params: ItemsParams, settings: Settings): Promise<ItemsResult> {
        const pageId = (params.mention?.data?.page as PageData).id

        if (!pageId) {
            return []
        }

        const page = await getPage(settings, pageId)

        return [
            {
                title: `${page.title} (${page.space.name})`,
                url: page.uri,
                ui: {
                    hover: {
                        text: page.title,
                    },
                },
                ai: {
                    content: 'The contents of the confluence page: ' + page.body,
                },
            },
        ]
    },
}

export default confluenceProvider
