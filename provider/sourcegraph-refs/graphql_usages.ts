import { z } from 'zod'

export interface Usage {
    repoName: string
    revision: string
    path: string
    range: {
        start: { line: number; character: number }
        end: { line: number; character: number }
    }
    surroundingContent: string
}

export const UsagesForSymbolResponseSchema = z.object({
    usagesForSymbol: z.object({
        nodes: z.array(
            z.object({
                symbol: z
                    .object({
                        name: z.string(),
                    })
                    .nullable(),
                usageKind: z.string(),
                provenance: z.string(),
                surroundingContent: z.string(),
                usageRange: z.object({
                    repository: z.string(),
                    revision: z.string(),
                    path: z.string(),
                    range: z.object({
                        start: z.object({
                            line: z.number(),
                            character: z.number(),
                        }),
                        end: z.object({
                            line: z.number(),
                            character: z.number(),
                        }),
                    }),
                }),
            }),
        ),
    }),
})
export function transformToUsages(response: z.infer<typeof UsagesForSymbolResponseSchema>): Usage[] {
    return response.usagesForSymbol.nodes.map(node => ({
        repoName: node.usageRange.repository,
        revision: node.usageRange.revision,
        path: node.usageRange.path,
        range: {
            start: {
                line: node.usageRange.range.start.line,
                character: node.usageRange.range.start.character,
            },
            end: {
                line: node.usageRange.range.end.line,
                character: node.usageRange.range.end.character,
            },
        },
        surroundingContent: node.surroundingContent,
    }))
}

export const USAGES_FOR_SYMBOL_QUERY = `
query UsagesForSymbol($repository: String!, $path: String!, $startLine: Int!, $startCharacter: Int!, $endLine: Int!, $endCharacter: Int!) {
    usagesForSymbol(
        range: {
            repository: $repository,
            path: $path,
            start: {
                line: $startLine,
                character: $startCharacter
            },
            end: {
                line: $endLine,
                character: $endCharacter
            }
        }
    ) {
        nodes {
            symbol {
                name
            }
            usageKind
            provenance
            surroundingContent
            usageRange {
                repository
                revision
                path
                range {
                    start { line character }
                    end { line character }
                }
            }
        }
    }
}`
