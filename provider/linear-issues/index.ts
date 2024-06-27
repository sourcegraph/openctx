import type {
    ItemsParams,
    ItemsResult,
    MentionsParams,
    MentionsResult,
    MetaResult,
    Provider,
} from '@openctx/provider'
import dedent from 'dedent'
import { XMLBuilder } from 'fast-xml-parser'
import { readFile } from 'fs/promises'

import type { UserCredentials } from './auth.js'

/** Settings for the Linear Issues OpenCtx provider. */
export type Settings = {
    userCredentialsPath?: string
    accessToken?: string
}

const xmlBuilder = new XMLBuilder({ format: true })

interface Issue {
    identifier: string
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

const NUMBER_OF_ISSUES_TO_FETCH = 10

const linearIssues: Provider<Settings> = {
    meta(): MetaResult {
        return { name: 'Linear Issues', mentions: {} }
    },

    async mentions(params: MentionsParams, settingsInput: Settings): Promise<MentionsResult> {
        let issues: Issue[] = []

        if (params.query) {
            const variables = { query: params.query, first: NUMBER_OF_ISSUES_TO_FETCH }
            const response = await linearApiRequest(issueSearchQuery, variables, settingsInput)
            issues = response.data.issueSearch.nodes as Issue[]
        } else {
            const variables = { first: NUMBER_OF_ISSUES_TO_FETCH / 2 }
            const response = await linearApiRequest(viewerIssuesQuery, variables, settingsInput)

            const createdIssues = response.data.viewer.createdIssues.nodes as Issue[]
            const assignedIssues = response.data.viewer.assignedIssues.nodes as Issue[]
            issues = dedupeWith([...assignedIssues, ...createdIssues], 'url')
        }

        const mentions = (issues ?? []).map(issue => ({
            title: `${issue.identifier} ${issue.title}`,
            uri: issue.url,
            description: issue.description,
        }))

        return mentions
    },

    async items(params: ItemsParams, settingsInput: Settings): Promise<ItemsResult> {
        if (!params.mention) {
            return []
        }

        const issueId = parseIssueIDFromURL(params.mention.uri)
        if (!issueId) {
            return []
        }

        const variables = { id: issueId }
        const data = await linearApiRequest(issueWithCommentsQuery, variables, settingsInput)
        const issue = data.data.issue as Issue
        const comments = issue.comments?.nodes as Comment[]

        const issueInfo = xmlBuilder.build({
            title: issue.title,
            description: issue.description || '',
            comments: comments.map(comment => comment.body).join('\n'),
            url: issue.url,
        })
        const content = dedent`
            Here is the Linear issue. Use it to check if it helps.
            Ignore it if it is not relevant.

            ${issueInfo}
        `

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

async function getAccessToken(settings: Settings): Promise<string> {
    if (settings?.accessToken) {
        return settings.accessToken
    }

    if (settings.userCredentialsPath) {
        const userCredentialsString = await readFile(settings.userCredentialsPath, 'utf-8')
        const userCredentials = JSON.parse(userCredentialsString) as Partial<UserCredentials>

        if (!userCredentials.access_token) {
            throw new Error(`access_token not found in ${settings.userCredentialsPath}`)
        }

        return userCredentials.access_token
    }

    throw new Error(
        'must provide a Linear user credentials path in the `userCredentialsPath` settings field or an accessToken in the linearClientOptions'
    )
}

async function linearApiRequest(
    query: string,
    variables: object,
    settings: Settings
): Promise<{ data: any }> {
    const accessToken = await getAccessToken(settings)
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

const dedupeWith = <T>(items: T[], key: keyof T | ((item: T) => string)): T[] => {
    const seen = new Set()
    const isKeyFunction = typeof key === 'function'

    return items.reduce((result, item) => {
        const itemKey = isKeyFunction ? key(item) : item[key]

        if (!seen.has(itemKey)) {
            seen.add(itemKey)
            result.push(item)
        }

        return result
    }, [] as T[])
}

const issueFragment = `
  fragment IssueFragment on Issue {
      identifier
      title
      url
      description
  }
`
const viewerIssuesQuery = `
  query ViewerIssues($first: Int!) {
    viewer {
      createdIssues(first: $first, orderBy: updatedAt) {
        nodes {
          ...IssueFragment
        }
      }
      assignedIssues(first: $first, orderBy: updatedAt) {
        nodes {
          ...IssueFragment
        }
      }
    }
  }

  ${issueFragment}
`
const issueSearchQuery = `
    query IssueSearch($query: String!, $first: Int!) {
        issueSearch(query: $query, first: $first, orderBy: updatedAt) {
            nodes {
              ...IssueFragment
            }
        }
    }

    ${issueFragment}
`
const issueWithCommentsQuery = `
  query IssueWithComment($id: String!) {
    issue(id: $id) {
      ...IssueFragment
      comments {
        nodes {
          body
        }
      }
    }
  }

  ${issueFragment}
`
