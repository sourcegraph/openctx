export class SourcegraphGraphQLAPIClient {
    public get endpoint(): string {
        return 'https://sourcegraph.com'
    }

    public async fetchSourcegraphAPI<T>(
        query: string,
        variables: Record<string, any> = {}
    ): Promise<T | Error> {
        const headers = new Headers()
        headers.set('Content-Type', 'application/json; charset=utf-8')
        headers.set('User-Agent', 'openctx-sourcegraph-search / 0.0.1')

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
