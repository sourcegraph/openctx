import { readFileSync } from 'fs'
import type {
    ItemsParams,
    ItemsResult,
    MentionsParams,
    MentionsResult,
    MetaResult,
    Provider,
} from '@openctx/provider'
import { XMLBuilder } from 'fast-xml-parser'

import type { UserCredentials } from './auth.js'

/** Settings for the Linear OpenCtx provider. */
export type Settings = {
    linearUserCredentialsPath?: string
    linearClientCredentials?: { accessToken?: string }
}

const xmlBuilder = new XMLBuilder({ format: true })

interface Issue {
    title: string
    url: string
    description: string
    comments?: {
        nodes: Comment[]
    }
}

interface Comment {
    body: string
}

const linearIssues: Provider<Settings> = {
    meta(): MetaResult {
        return { name: 'Linear Issues', features: { mentions: true } }
    },

    async mentions(params: MentionsParams, settingsInput: Settings): Promise<MentionsResult> {
        if (!params.query || params.query.length < 3) {
            return []
        }

        const query = `
            query IssueSearch($query: String!, $first: Int!) {
                issueSearch(query: $query, first: $first, orderBy: updatedAt) {
                    nodes {
                        title
                        url
                    }
                }
            }
        `
        const variables = { query: params.query, first: 10 }
        const response = await linearApiRequest(query, variables, settingsInput)
        const issues = response.data.issueSearch.nodes as Issue[]

        return (issues ?? []).map(issue => ({
            title: issue.title,
            uri: issue.url,
        }))
    },

    async items(params: ItemsParams, settingsInput: Settings): Promise<ItemsResult> {
        if (!params.mention) {
            return []
        }

        const issueId = parseIssueIDFromURL(params.mention.uri)
        if (!issueId) {
            return []
        }

        const query = `
            query Issue($id: String!) {
                issue(id: $id) {
                    title
                    description
                    comments {
                        nodes {
                            body
                        }
                    }
                }
            }
        `
        const variables = { id: issueId }
        const data = await linearApiRequest(query, variables, settingsInput)
        const issue = data.data.issue as Issue
        const comments = issue.comments?.nodes as Comment[]

        const content = xmlBuilder.build({
            linear_issue: {
                description: issue.description || '',
                comments: comments.map(comment => comment.body).join('\n'),
            },
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

function getAccessToken(settings: Settings): string {
    if (settings.linearClientCredentials?.accessToken) {
        return settings.linearClientCredentials.accessToken
    }

    if (settings.linearUserCredentialsPath) {
        const userCredentialsString = readFileSync(settings.linearUserCredentialsPath, 'utf-8')
        const userCredentials = JSON.parse(userCredentialsString) as Partial<UserCredentials>

        if (!userCredentials.access_token) {
            throw new Error(`access_token not found in ${settings.linearUserCredentialsPath}`)
        }

        return userCredentials.access_token
    }

    throw new Error(
        'must provide a Linear user credentials path in the `linearUserCredentialsPath` settings field or an accessToken in the linearClientOptions'
    )
}

async function linearApiRequest(
    query: string,
    variables: object,
    settings: Settings
): Promise<{ data: any }> {
    const accessToken = getAccessToken(settings)
    const response = await fetch('https://api.linear.app/graphql', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ query, variables }),
    })

    if (!response.ok) {
        throw new Error(`Linear API request failed: ${response.statusText}`)
    }

    const json = (await response.json()) as { data: object }

    if (!json.data) {
        throw new Error('Linear API request failed: no data')
    }

    return json
}

function parseIssueIDFromURL(urlStr: string): string | undefined {
    const url = new URL(urlStr)
    if (!url.hostname.endsWith('linear.app')) {
        return undefined
    }
    const match = url.pathname.match(/\/issue\/([a-zA-Z0-9_-]+)/)
    return match ? match[1] : undefined
}
