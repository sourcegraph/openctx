import { Octokit } from '@octokit/core'
import type { Endpoints, RequestParameters } from '@octokit/types'

export interface GithubClientConfig {
    accessToken: string
    baseURL?: string
}

export type GithubEndpoints = Endpoints

export class GithubClient {
    private octokit: Octokit

    constructor(config: GithubClientConfig) {
        let baseUrl: string | undefined
        if (config.baseURL) {
            baseUrl = config.baseURL.trimEnd()
            if (baseUrl.endsWith('/')) {
                baseUrl = baseUrl.slice(0, -1)
            }
            if (!baseUrl.endsWith('/api/v3')) {
                baseUrl = `${baseUrl}/api/v3`
            }
        }
        this.octokit = new Octokit({ auth: config.accessToken, baseUrl })
    }

    async request<E extends keyof Endpoints>(
        req: E,
        params: E extends keyof Endpoints
            ? Endpoints[E]['parameters'] & RequestParameters
            : RequestParameters
    ): Promise<Endpoints[E]['response']['data']> {
        const response = await this.octokit.request(req, params)

        return response?.data
    }
}
