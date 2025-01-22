import type {
    ItemsParams,
    ItemsResult,
    MentionsParams,
    MentionsResult,
    MetaParams,
    MetaResult,
    Provider,
} from '@openctx/provider'
import { z } from 'zod'
import { SourcegraphGraphQLAPIClient, isError } from './graphql.js'
import type { SymbolInfo } from './graphql_symbols.js'

const settingsSchema = z.object({
    sourcegraphEndpoint: z.string(),
    sourcegraphToken: z.string(),
    repositoryNames: z.string().array(),
})

/**
 * An OpenCtx provider that fetches the content of a URL and provides it as an item.
 */
class SourcegraphRefsProvider implements Provider<z.infer<typeof settingsSchema>> {
    private graphqlClient: SourcegraphGraphQLAPIClient | undefined
    private repositories: string[] = []
    private sourcegraphEndpoint = ''

    public meta(_params: MetaParams, settings: z.infer<typeof settingsSchema>): MetaResult {
        this.graphqlClient = new SourcegraphGraphQLAPIClient(
            settings.sourcegraphEndpoint,
            settings.sourcegraphToken,
        )
        this.sourcegraphEndpoint = settings.sourcegraphEndpoint
        this.repositories = settings.repositoryNames
        return {
            name: 'Sourcegraph usages',
            mentions: { label: 'Type a symbol name' },
            annotations: { selectors: [] },
        }
    }

    async mentions(params: MentionsParams): Promise<MentionsResult> {
        if (!this.graphqlClient) {
            return []
        }
        const symbols = await this.graphqlClient.fetchSymbols(params.query ?? '', this.repositories)
        if (isError(symbols)) {
            return []
        }
        const mentions = symbols.map(s => ({
            title: s.name,
            uri: `${s.path}@L${s.range.start.line + 1}`,
            data: {
                symbol: s,
            },
        }))
        return mentions
    }

    async items(params: ItemsParams): Promise<ItemsResult> {
        if (!this.graphqlClient) {
            return []
        }
        const mention = params.mention
        if (!mention?.data?.symbol) {
            return []
        }

        const symbol: SymbolInfo | undefined = mention.data.symbol as SymbolInfo
        if (!symbol) {
            return []
        }

        const usages = await this.graphqlClient.fetchUsages(
            symbol.repositoryName,
            symbol.path,
            symbol.range.start.line,
            symbol.range.start.character,
            symbol.range.end.line,
            symbol.range.end.character,
        )

        if (isError(usages)) {
            console.error('Error fetching usages:', usages)
            return []
        }

        const graphqlClient = this.graphqlClient
        return (
            await Promise.all(
                usages.flatMap(async usage => {
                    const blob = await graphqlClient.fetchBlob({
                        repoName: usage.repoName,
                        revspec: usage.revision,
                        path: usage.path,
                        startLine: Math.max(1, usage.range.start.line + 1 - 5),
                        endLine: usage.range.end.line + 1 + 5,
                    })
                    if (isError(blob)) {
                        console.error('Error fetching blob:', blob)
                        return []
                    }
                    return {
                        title: usage.path,
                        url: `${this.sourcegraphEndpoint}/${usage.repoName}@${usage.revision}/-/blob/${usage.path}?L${usage.range.start.line + 1}-${usage.range.end.line + 1}`,
                        ai: {
                            content: blob.content,
                        },
                    }
                }),
            )
        ).flat()
    }
}

const sourcegraphRefsProvider = new SourcegraphRefsProvider()
export default sourcegraphRefsProvider
