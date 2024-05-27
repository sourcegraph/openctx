import type { Settings } from './index.ts'

export interface JiraIssue {
    id: string
    key: string
    fields: {
        summary: string
        description: string
    }
}

const authHeaders = (settings: Settings) => ({
    Authorization: `Basic ${btoa(`${settings.username}:${settings.apiToken}`)}`,
})

const endpoint = (settings: Settings) =>
    'https://' + settings.host + (settings.port ? `:${settings.port}` : '')

export const issueUrl = (settings: Settings, issue: JiraIssue) =>
    `${endpoint(settings)}/browse/${issue.key}`

export const fetchLatestJiraTickets = async (settings: Settings): Promise<JiraIssue[]> => {
    const response = await fetch(
        `${endpoint(settings)}/rest/api/2/search?jql=${encodeURIComponent('ORDER BY created DESC')}`,
        {
            method: 'GET',
            headers: authHeaders(settings),
        }
    )

    if (!response.ok) {
        throw new Error(`Error fetching JIRA tickets: ${response.statusText}`)
    }

    return ((await response.json()) as { issues: JiraIssue[] }).issues
}
