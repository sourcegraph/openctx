import type {
    ItemsParams,
    ItemsResult,
    MentionsParams,
    MentionsResult,
    MetaResult,
    Provider,
} from '@openctx/provider'
import { extractArticles, fetchHackerNewsHomepage } from './hn.js'

const urlFetcher: Provider = {
    meta(): MetaResult {
        return {
            name: 'Hacker News',
            mentions: { label: 'Browse HN frontpage...' },
            annotations: { selectors: [] },
        }
    },

    async mentions(params: MentionsParams): Promise<MentionsResult> {
        const html = await fetchHackerNewsHomepage()
        const articles = extractArticles(html)

        return articles.map((article: { title: string; url: string }) => ({
            title: article.title,
            uri: article.url,
            data: { content: article.title },
        }))
    },

    async items(params: ItemsParams): Promise<ItemsResult> {
        return fetchItem(params)
    },
}
function fetchItem(params: ItemsParams): ItemsResult | PromiseLike<ItemsResult> {
    throw new Error('Function not implemented.')
}
export default urlFetcher
