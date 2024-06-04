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
    Authorization: `Basic ${btoa(`${settings.username}:${settings.apiToken}`)}`,
})

const endpoint = (settings: Settings) =>
    'https://' + settings.host + (settings.port ? `:${settings.port}` : '')

export const searchIssues = async (
    query: string | undefined,
    settings: Settings
): Promise<IssuePickerItem[]> => {
    const pickerResponse = await fetch(
        `${endpoint(settings)}/rest/api/2/issue/picker?query=${encodeURIComponent(query || '')}`,
        {
            method: 'GET',
            headers: authHeaders(settings),
        }
    )
    if (!pickerResponse.ok) {
        throw new Error(
            `Error fetching recent JIRA issues (${pickerResponse.status} ${
                pickerResponse.statusText
            }): ${await pickerResponse.text()}`
        )
    }

    const pickerJSON = (await pickerResponse.json()) as { sections: { issues: IssuePickerItem[] }[] }

    return (
        pickerJSON.sections?.[0]?.issues?.map(json => {
            return {
                ...json,
                // add a URL property, as the API response doesn't have one
                url: `${endpoint(settings)}/browse/${json.key}`,
            }
        }) || []
    )
}

export const fetchIssue = async (issueId: string, settings: Settings): Promise<Issue | null> => {
    const issueResponse = await fetch(
        `${endpoint(settings)}/rest/api/2/search/?jql=${encodeURIComponent(`key="${issueId}"`)}`,
        {
            method: 'GET',
            headers: authHeaders(settings),
        }
    )
    if (!issueResponse.ok) {
        throw new Error(
            `Error fetching JIRA issue (${issueResponse.status} ${
                issueResponse.statusText
            }): ${await issueResponse.text()}`
        )
    }

    const responseJSON = (await issueResponse.json()) as { issues: Issue[] }
    const issue = responseJSON.issues?.[0]

    if (!issue) {
        return null
    }

    return {
        ...issue,
        // add a URL property, as the API response doesn't have one
        url: `${endpoint(settings)}/browse/${issue?.key}`,
    }
}
