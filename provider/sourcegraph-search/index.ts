import type {
    AnnotationsParams,
    AnnotationsResult,
    ItemsParams,
    ItemsResult,
    MentionsParams,
    MentionsResult,
    MetaParams,
    MetaResult,
    Provider,
    ProviderSettings,
} from '@openctx/provider'
import { SourcegraphGraphQLAPIClient } from './graphql.js'
import { isError, searchForFileChunks } from './search.js'

const graphqlClient = new SourcegraphGraphQLAPIClient()

/** Used to prefix context queries to indicate a sourcegraph search */
const QUERY_PREFIXES = ['?', 'src:']

/** We always limit our searches to files and a conservatively sized result set */
const SEARCH_QUERY_CONST = 'type:file count:10'

const sourcegraphSearch: Provider = {
    meta(params: MetaParams, settings: ProviderSettings): MetaResult {
        return {
            // empty since we don't provide any annotations.
            selector: [],
            name: 'Sourcegraph Search',
            features: { mentions: true },
        }
    },

    async mentions(params: MentionsParams): Promise<MentionsResult> {
        if (!params.query) {
            return []
        }

        const query = searchQueryFromMentionQuery(params.query)
        if (!query) {
            return []
        }

        const url = `${graphqlClient.endpoint}/search?q=${encodeURIComponent(
            query.sourcegraphQuery
        )}&patternType=literal`

        return [
            {
                title: query.sourcegraphQuery,
                uri: url,
            },
        ]
    },

    async items(params: ItemsParams, settings: ProviderSettings): Promise<ItemsResult> {
        if (!params.mention?.uri) {
            return []
        }

        const query = searchQueryFromURL(graphqlClient.endpoint, params.mention?.uri)
        if (!query) {
            return []
        }

        const chunks = await searchForFileChunks(graphqlClient, query.sourcegraphQuery)
        if (isError(chunks)) {
            throw chunks
        }

        return chunks.map(chunk => {
            return {
                title: `${chunk.repoName} ${chunk.path}:${chunk.lineRange}`,
                uri: chunk.uri,
                ui: {
                    hover: { text: `From Sourcegraph query ${query.userInput}` },
                },
                ai: {
                    content: chunk.content,
                },
            }
        })
    },

    annotations(params: AnnotationsParams, settings: ProviderSettings): AnnotationsResult {
        return []
    },
}

interface SearchQuery {
    userInput: string
    sourcegraphQuery: string
}

function searchQueryFromURL(endpoint: string, url: string): SearchQuery | undefined {
    const parsedUrl = new URL(url)
    const q = parsedUrl.searchParams.get('q')

    if (!q || parsedUrl.hostname !== new URL(endpoint).hostname) {
        return undefined
    }

    return {
        userInput: trimPrefix(q, SEARCH_QUERY_CONST).trim(),
        sourcegraphQuery: q,
    }
}

function searchQueryFromMentionQuery(query: string): SearchQuery {
    const userInput = trimFirstPrefix(query, QUERY_PREFIXES)
    return {
        userInput,
        sourcegraphQuery: `${SEARCH_QUERY_CONST} ${userInput}`,
    }
}

function trimFirstPrefix(s: string, prefixes: string[]): string {
    const prefix = prefixes.find(prefix => s.startsWith(prefix)) ?? ''
    return s.slice(prefix.length)
}

function trimPrefix(s: string, prefix: string): string {
    return s.startsWith(prefix) ? s.slice(prefix.length) : s
}

export default sourcegraphSearch
