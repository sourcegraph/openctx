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
                data: {
                    page: {
                        id: page.id,
                    },
                },
            }
        })
    },

    async items(params: ItemsParams, settings: Settings): Promise<ItemsResult> {
        const pageId = (params.mention?.data?.page as { id: string }).id

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
                        // Show the title here because the UI only shows the URL
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
