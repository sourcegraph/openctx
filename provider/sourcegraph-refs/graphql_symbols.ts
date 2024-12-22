import { z } from 'zod'

export interface SymbolInfo {
    name: string
    repositoryId: string
    repositoryName: string
    path: string
    range: {
        start: { line: number; character: number }
        end: { line: number; character: number }
    }
}

export const FuzzySymbolsResponseSchema = z.object({
    search: z.object({
        results: z.object({
            results: z.array(
                z.object({
                    __typename: z.string(),
                    file: z.object({
                        path: z.string(),
                    }),
                    symbols: z.array(
                        z.object({
                            name: z.string(),
                            location: z.object({
                                range: z.object({
                                    start: z.object({ line: z.number(), character: z.number() }),
                                    end: z.object({ line: z.number(), character: z.number() }),
                                }),
                                resource: z.object({
                                    path: z.string(),
                                }),
                            }),
                        }),
                    ),
                    repository: z.object({
                        id: z.string(),
                        name: z.string(),
                    }),
                }),
            ),
        }),
    }),
})

export function transformToSymbols(response: z.infer<typeof FuzzySymbolsResponseSchema>): SymbolInfo[] {
    return response.search.results.results.flatMap(result => {
        return (result.symbols || []).map(symbol => ({
            name: symbol.name,
            repositoryId: result.repository.id,
            repositoryName: result.repository.name,
            path: symbol.location.resource.path,
            range: {
                start: {
                    line: symbol.location.range.start.line,
                    character: symbol.location.range.start.character,
                },
                end: {
                    line: symbol.location.range.end.line,
                    character: symbol.location.range.end.character,
                },
            },
        }))
    })
}

export const FUZZY_SYMBOLS_QUERY = `
query FuzzySymbols($query: String!) {
    search(patternType: regexp, query: $query) {
        results {
            results {
                ... on FileMatch {
                    __typename
                    file {
                        path
                    }
                    symbols {
                        name
                        location {
                            range {
                                start { line, character}
                                end { line, character }
                            }
                            resource {
                                path
                            }
                        }
                    }
                    repository {
                        id
                        name
                    }
                }
            }
        }
    }
}
`
