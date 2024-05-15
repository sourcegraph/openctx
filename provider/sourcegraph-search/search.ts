interface GraphQLClient {
    endpoint: string
    fetchSourcegraphAPI<T>(query: string, variables: Record<string, any>): Promise<T | Error>
}

interface Chunk {
    uri: string
    path: string
    content: string
    repoName: string
    /** A 1-based string like 119 (one line) or 119-121 (multi-line). */
    lineRange: string
}

export async function searchForFileChunks(
    graphqlClient: GraphQLClient,
    query: string
): Promise<Chunk[] | Error> {
    const results = await graphqlClient
        .fetchSourcegraphAPI<APIResponse<SearchResponse>>(SEARCH_QUERY, {
            query,
        })
        .then(response =>
            extractDataOrError(response, data => {
                return data.search.results.results.flatMap(result => {
                    if (result.__typename !== 'FileMatch') {
                        return []
                    }
                    const url = `${graphqlClient.endpoint.replace(/\/$/, '')}${result.file.url}`
                    return result.chunkMatches.map(chunkMatch => {
                        const lineRange = chunkMatchContentToLineRange(
                            chunkMatch.content,
                            chunkMatch.contentStart.line
                        )
                        return {
                            uri: `${url}?L${lineRange}`,
                            path: result.file.path,
                            repoName: result.repository.name,
                            content: chunkMatch.content,
                            lineRange,
                        } satisfies Chunk
                    })
                })
            })
        )
    return results
}

function chunkMatchContentToLineRange(content: string, startLine: number): string {
    // chunk match API is zero based
    const start = startLine + 1
    // Remove trailing newline then split will be number of lines
    const lineCount = content.replace(/\r?\n$/, '').split('\n').length
    return lineCount <= 1 ? `${start}` : `${start}-${start + lineCount - 1}`
}

const SEARCH_QUERY = `
query CodyMentionProviderSearch($query: String!) {
  search(query: $query, version: V3, patternType: literal) {
    results {
      results {
        __typename
        ... on FileMatch {
          repository {
            name
          }
          file {
            url
            path
          }
          chunkMatches {
            content
            contentStart {
              line
            }
          }
        }
      }
    }
  }
}`

interface SearchResponse {
    search: {
        results: {
            results: {
                __typename: string
                repository: {
                    name: string
                }
                file: {
                    url: string
                    path: string
                }
                chunkMatches: {
                    content: string
                    contentStart: {
                        line: number
                    }
                }[]
            }[]
        }
    }
}

interface APIResponse<T> {
    data?: T
    errors?: { message: string; path?: string[] }[]
}

function extractDataOrError<T, R>(response: APIResponse<T> | Error, extract: (data: T) => R): R | Error {
    if (isError(response)) {
        return response
    }
    if (response.errors && response.errors.length > 0) {
        return new Error(response.errors.map(({ message }) => message).join(', '))
    }
    if (!response.data) {
        return new Error('response is missing data')
    }
    return extract(response.data)
}

export const isError = (value: unknown): value is Error => value instanceof Error
