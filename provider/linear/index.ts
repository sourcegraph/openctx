import { readFileSync } from 'fs'
import type {
    ItemsParams,
    ItemsResult,
    MentionsParams,
    MentionsResult,
    MetaResult,
    Provider,
} from '@openctx/provider'

import { LinearClient, type LinearClientOptions } from '@linear/sdk'
import { XMLBuilder } from 'fast-xml-parser'
import {
    type LinearAuthClientConfig,
    type UserCredentials,
    createAccessToken,
} from './create-access-token.js'

/** Settings for the Linear OpenCtx provider. */
export type Settings = {
    linearUserCredentialsPath?: string
    linearClientConfig?: LinearAuthClientConfig
    linearClientCredentials?: LinearClientOptions
}

const xmlBuilder = new XMLBuilder({ format: true })

const linearIssues: Provider<Settings> = {
    meta(params, settings): MetaResult {
        if (!settings.linearClientCredentials && settings.linearClientConfig) {
            createAccessToken(settings.linearClientConfig)
        }

        return { name: 'Linear Issues', features: { mentions: true } }
    },

    async mentions(params: MentionsParams, settingsInput): Promise<MentionsResult> {
        if (!params.query) {
            return []
        }

        const linearClient = getLinearClient(settingsInput)
        const issues = await linearClient.issueSearch({ query: params.query, first: 25 })

        return (issues.nodes ?? []).map(issue => ({
            title: issue.title,
            uri: issue.url,
        }))
    },

    async items(params: ItemsParams, settingsInput): Promise<ItemsResult> {
        if (!params.mention) {
            return []
        }

        const issueId = parseIssueIDFromURL(params.mention.uri)
        if (!issueId) {
            return []
        }

        const linearClient = getLinearClient(settingsInput)

        const issue = await linearClient.issue(issueId)
        const comments = await issue.comments()

        const content = xmlBuilder.build({
            description: issue.description || '',
            comments: comments.nodes.map(comment => comment.body).join('\n'),
        })

        return [
            {
                title: issue.title,
                url: issue.url,
                ai: {
                    content,
                },
            },
        ]
    },
}

export default linearIssues

function getLinearClient(settings: Settings): LinearClient {
    if (settings.linearUserCredentialsPath) {
        const userCredentialsString = readFileSync(settings.linearUserCredentialsPath, 'utf-8')
        const userCredentials = JSON.parse(userCredentialsString) as Partial<UserCredentials>

        if (!userCredentials.access_token) {
            throw new Error(`access_token not found in ${settings.linearUserCredentialsPath}`)
        }

        return new LinearClient({ accessToken: userCredentials.access_token })
    }

    if (settings.linearClientCredentials?.accessToken) {
        return new LinearClient({ accessToken: settings.linearClientCredentials?.accessToken })
    }

    if (settings.linearClientCredentials?.apiKey) {
        return new LinearClient({ apiKey: settings.linearClientCredentials?.apiKey })
    }

    throw new Error(
        'must provide a Linear user credentials path in the `linearUserCredentialsPath` settings field or a path to a JSON file in the LINEAR_USER_CREDENTIALS_FILE env var'
    )
}

function parseIssueIDFromURL(urlStr: string): string | undefined {
    const url = new URL(urlStr)
    if (!url.hostname.endsWith('linear.app')) {
        return undefined
    }
    const match = url.pathname.match(/\/issue\/([a-zA-Z0-9_-]+)/)
    return match ? match[1] : undefined
}
