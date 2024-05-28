import type { Settings } from './index.ts'

interface IssueJSON {
    id: string
    key: string
    fields: {
        summary: string
        description: string
        subtasks?: IssueJSON[]
    }
}

export interface JiraIssue {
    id: string
    key: string
    url: string
    fields: {
        summary: string
        description: string
        subtasks?: JiraIssue[]
    }
}

// Adds the URL fields to the issues & nested issues
const jsonToIssue = (json: IssueJSON, settings: Settings): JiraIssue => ({
    id: json.id,
    key: json.key,
    fields: {
        summary: json.fields.summary,
        description: json.fields.description,
        subtasks: json.fields.subtasks?.map(subtask => ({
            id: subtask.id,
            key: subtask.key,
            fields: {
                summary: subtask.fields.summary,
                description: subtask.fields.description,
            },
            url: `${endpoint(settings)}/browse/${subtask.key}`,
        })),
    },
    url: `${endpoint(settings)}/browse/${json.key}`,
})

const authHeaders = (settings: Settings) => ({
    Authorization: `Basic ${btoa(`${settings.username}:${settings.apiToken}`)}`,
})

const endpoint = (settings: Settings) =>
    'https://' + settings.host + (settings.port ? `:${settings.port}` : '')

const jqlEscapeString = (query: string): string => query.replace(/"/g, '\\"')

export const fetchRecentIssues = async (settings: Settings): Promise<JiraIssue[]> => {
    const response = await fetch(
        `${endpoint(settings)}/rest/api/2/search?jql=${encodeURIComponent(
            '(assignee = currentUser() OR reporter = currentUser() OR issue in issueHistory()) ORDER BY created DESC'
        )}`,
        {
            method: 'GET',
            headers: authHeaders(settings),
        }
    )

    if (!response.ok) {
        throw new Error(
            `Error fetching recent JIRA issues (${response.status} ${
                response.statusText
            }): ${await response.text()}`
        )
    }

    return ((await response.json()) as { issues: IssueJSON[] }).issues.map(issue =>
        jsonToIssue(issue, settings)
    )
}

export const searchIssues = async (query: string, settings: Settings): Promise<JiraIssue[]> => {
    // If query is in Jira issue ID format (ABC-123) fetch it, otherwise search
    if (/^[A-Z]+-\d+$/.test(query)) {
        return fetchIssue(query, settings).then(issue => (issue ? [issue] : []))
    }

    const response = await fetch(
        `${endpoint(settings)}/rest/api/2/search?jql=${encodeURIComponent(
            `summary ~ "${jqlEscapeString(query)}" OR description ~ "${jqlEscapeString(query)}"`
        )}`,
        {
            method: 'GET',
            headers: authHeaders(settings),
        }
    )

    if (!response.ok) {
        throw new Error(
            `Error fetching recent JIRA issues (${response.status} ${
                response.statusText
            }): ${await response.text()}`
        )
    }

    return ((await response.json()) as { issues: IssueJSON[] }).issues.map(issue =>
        jsonToIssue(issue, settings)
    )
}

const fetchIssue = async (issueId: string, settings: Settings): Promise<JiraIssue | null> => {
    const response = await fetch(
        `${endpoint(settings)}/rest/api/2/issue/${encodeURIComponent(issueId)}`,
        {
            method: 'GET',
            headers: authHeaders(settings),
        }
    )
    if (response.status === 404) {
        return null
    }
    if (!response.ok) {
        throw new Error(
            `Error fetching JIRA issue (${response.status} ${
                response.statusText
            }): ${await response.text()}`
        )
    }
    return jsonToIssue((await response.json()) as IssueJSON, settings)
}
