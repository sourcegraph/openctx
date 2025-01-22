import { escapeRegExp } from 'lodash'
import { BLOB_QUERY, type BlobInfo, BlobResponseSchema } from './graphql_blobs.js'
import {
    FUZZY_SYMBOLS_QUERY,
    FuzzySymbolsResponseSchema,
    type SymbolInfo,
    transformToSymbols,
} from './graphql_symbols.js'
import {
    USAGES_FOR_SYMBOL_QUERY,
    type Usage,
    UsagesForSymbolResponseSchema,
    transformToUsages,
} from './graphql_usages.js'

interface APIResponse<T> {
    data?: T
    errors?: { message: string; path?: string[] }[]
}

export class SourcegraphGraphQLAPIClient {
    constructor(
        private readonly endpoint: string,
        private readonly token: string,
    ) {}

    public async fetchSymbols(query: string, repositories: string[]): Promise<SymbolInfo[] | Error> {
        const response: any | Error = await this.fetchSourcegraphAPI<APIResponse<any>>(
            FUZZY_SYMBOLS_QUERY,
            {
                query: `type:symbol count:30 ${
                    repositories.length > 0 ? `repo:^(${repositories.map(escapeRegExp).join('|')})$` : ''
                } ${query}`,
            },
        )

        if (isError(response)) {
            return response
        }

        try {
            const validatedData = FuzzySymbolsResponseSchema.parse(response.data)
            return transformToSymbols(validatedData)
        } catch (error) {
            return new Error(`Invalid response format: ${error}`)
        }
    }

    public async fetchUsages(
        repository: string,
        path: string,
        startLine: number,
        startCharacter: number,
        endLine: number,
        endCharacter: number,
    ): Promise<Usage[] | Error> {
        const response: any | Error = await this.fetchSourcegraphAPI<
            APIResponse<typeof UsagesForSymbolResponseSchema>
        >(USAGES_FOR_SYMBOL_QUERY, {
            repository,
            path,
            startLine,
            startCharacter,
            endLine,
            endCharacter,
        })

        if (isError(response)) {
            return response
        }

        try {
            // TODO(beyang): sort or filter by provenance
            const validatedData = UsagesForSymbolResponseSchema.parse(response.data)
            return transformToUsages(validatedData)
        } catch (error) {
            return new Error(`Invalid response format: ${error}`)
        }
    }

    public async fetchBlob({
        repoName,
        revspec,
        path,
        startLine,
        endLine,
    }: {
        repoName: string
        revspec: string
        path: string
        startLine: number
        endLine: number
    }): Promise<BlobInfo | Error> {
        const response: any | Error = await this.fetchSourcegraphAPI<APIResponse<BlobInfo>>(BLOB_QUERY, {
            repoName,
            revspec,
            path,
            startLine,
            endLine,
        })

        if (isError(response)) {
            return response
        }

        try {
            const validatedData = BlobResponseSchema.parse(response.data)
            return {
                repoName,
                revision: revspec,
                path: validatedData.repository.commit.blob.path,
                range: {
                    start: { line: startLine, character: 0 },
                    end: { line: endLine, character: 0 },
                },
                content: validatedData.repository.commit.blob.content,
            }
        } catch (error) {
            return new Error(`Invalid response format: ${error}`)
        }
    }

    public async fetchSourcegraphAPI<T>(
        query: string,
        variables: Record<string, any> = {},
    ): Promise<T | Error> {
        const headers = new Headers()
        headers.set('Content-Type', 'application/json; charset=utf-8')
        headers.set('User-Agent', 'openctx-sourcegraph-search / 0.0.1')
        headers.set('Authorization', `token ${this.token}`)

        const queryName = query.match(/^\s*(?:query|mutation)\s+(\w+)/m)?.[1] ?? 'unknown'
        const url = this.endpoint + '/.api/graphql?' + queryName

        return fetch(url, {
            method: 'POST',
            body: JSON.stringify({ query, variables }),
            headers,
        })
            .then(verifyResponseCode)
            .then(response => response.json() as T)
            .catch(error => new Error(`accessing Sourcegraph GraphQL API: ${error} (${url})`))
    }
}

async function verifyResponseCode(response: Response): Promise<Response> {
    if (!response.ok) {
        const body = await response.text()
        throw new Error(`HTTP status code ${response.status}${body ? `: ${body}` : ''}`)
    }
    return response
}

export const isError = (value: unknown): value is Error => value instanceof Error
