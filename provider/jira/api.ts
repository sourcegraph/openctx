import type { Settings } from './index.ts'

export interface IssuePickerItem {
    key: string
    summaryText: string
    url: string
}

export interface Issue {
    key: string
    url: string
    fields: {
        summary: string
        description: string
        labels: string[]
        subtasks?: Issue[]
    }
}

const authHeaders = (settings: Settings) => ({
    Authorization: `Basic ${Buffer.from(`${settings.email}:${settings.apiToken}`).toString('base64')}`,
})

const buildUrl = (settings: Settings, path: string, searchParams: Record<string, string> = {}) => {
    // Avoid double / if settings.url ends with '/' and path starts with '/'
    const url = new URL(settings.url.replace(/\/$/, '') + path)
    url.search = new URLSearchParams(searchParams).toString()
    return url
}

export const searchIssues = async (
    query: string | undefined,
    settings: Settings,
): Promise<IssuePickerItem[]> => {
    const pickerResponse = await fetch(
        buildUrl(settings, '/rest/api/2/issue/picker', {
            query: query || '',
        }),
        {
            method: 'GET',
            headers: authHeaders(settings),
        },
    )
    if (!pickerResponse.ok) {
        throw new Error(
            `Error fetching recent JIRA issues (${pickerResponse.status} ${
                pickerResponse.statusText
            }): ${await pickerResponse.text()}`,
        )
    }

    const pickerJSON = (await pickerResponse.json()) as {
        sections: {
            issues: {
                key: string
                summaryText: string
                url: string
            }[]
        }[]
    }

    return (
        pickerJSON.sections?.[0]?.issues?.map(json => {
            return {
                ...json,
                url: buildUrl(settings, `/browse/${json.key}`).toString(),
            }
        }) || []
    )
}

export const fetchIssue = async (issueId: string, settings: Settings): Promise<Issue | null> => {
    const issueResponse = await fetch(
        buildUrl(settings, '/rest/api/2/search/', {
            jql: `key="${issueId}"`,
        }),
        {
            method: 'GET',
            headers: authHeaders(settings),
        },
    )
    if (!issueResponse.ok) {
        throw new Error(
            `Error fetching JIRA issue (${issueResponse.status} ${
                issueResponse.statusText
            }): ${await issueResponse.text()}`,
        )
    }

    const responseJSON = (await issueResponse.json()) as { issues: Issue[] }
    const issue = responseJSON.issues?.[0]

    if (!issue) {
        return null
    }

    return {
        ...issue,
        url: buildUrl(settings, `/browse/${issue.key}`).toString(),
    }
}
