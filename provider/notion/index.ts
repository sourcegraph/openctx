import { Client, type LogLevel, isFullBlock, isFullPage, iteratePaginatedAPI } from '@notionhq/client'
import type {
    ItemsParams,
    ItemsResult,
    MentionsParams,
    MentionsResult,
    MetaParams,
    MetaResult,
    Provider,
} from '@openctx/provider'
import { getTextFromBlock } from './parse-text-from-any-block-type.js'

/**
 * Settings for the Notion OpenCtx provider.
 *
 * This is a subset of
 * [ClientOptions](https://github.com/makenotion/notion-sdk-js/blob/v2.2.15/README.md#client-options)
 * from notion-sdk-js (see Client constructor). Note that auth is required
 * unlike the constructor.
 */
export type Settings = {
    /**
     * The token for communicating with the Notion API. See
     * https://developers.notion.com/docs/getting-started to get set up.
     */
    auth: string
    timeoutMs?: number
    baseUrl?: string
    logLevel?: LogLevel
    notionVersion?: string
}

/**
 * An [OpenCtx](https://openctx.org) provider that brings Notion context to code AI and
 * editors.
 */
const notion: Provider<Settings> = {
    meta(params: MetaParams, settings: Settings): MetaResult {
        return {
            // empty since we don't provide any annotations.
            selector: [],
            name: 'Notion',
            features: { mentions: true },
        }
    },

    async mentions(params: MentionsParams, settings: Settings): Promise<MentionsResult> {
        if (!params.query) {
            return []
        }

        const notion = new Client(settings)

        // search API filters by page title
        const response = await notion.search({
            query: params.query,
        })
        const mentions: MentionsResult = []
        for (const page of response.results) {
            if (!isFullPage(page)) continue

            // Technically the title should be at ".title", but the typescript
            // definition doesn't say that. So we do the safer approach.
            let title: string | undefined = undefined
            for (const prop of Object.values(page.properties)) {
                if (prop.type === 'title') {
                    title = prop.title[0].plain_text
                    break
                }
            }

            if (!title) continue

            mentions.push({
                title,
                uri: page.url,
            })
        }

        return mentions
    },

    async items(params: ItemsParams, settings: Settings): Promise<ItemsResult> {
        if (!params.mention) {
            return []
        }

        const page_id = params.mention.uri.split('-').pop()
        if (!page_id) {
            return []
        }

        const notion = new Client(settings)
        const blocks = []
        for await (const block of iteratePaginatedAPI(notion.blocks.children.list, {
            block_id: page_id,
        })) {
            if (!isFullBlock(block)) continue
            blocks.push(getTextFromBlock(block))
        }

        if (!blocks) {
            return []
        }

        return [
            {
                title: params.mention.title,
                url: params.mention.uri,
                ai: {
                    content: blocks.join('\n'),
                },
            },
        ]
    },
}

export default notion
