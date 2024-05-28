import type {
    ItemsParams,
    ItemsResult,
    MentionsParams,
    MentionsResult,
    MetaParams,
    MetaResult,
    Provider,
} from '@openctx/provider'
import { XMLBuilder } from 'fast-xml-parser'
import { type JiraIssue, fetchRecentIssues, searchIssues } from './api.js'

export type Settings = {
    host: string
    port?: string
    username: string
    apiToken: string
}

const xmlBuilder = new XMLBuilder({ format: true })

const issueToItemContent = (issue: JiraIssue): string => {
    const subtasks = issue.fields.subtasks?.map(subtask => issueToItemContent(subtask))
    const issueObject = {
        issue: {
            id: issue.id,
            key: issue.key,
            summary: issue.fields.summary,
            description: issue.fields.description,
            subtasks: subtasks || [],
        },
    }
    return xmlBuilder.build(issueObject)
}

const jiraProvider: Provider = {
    meta(params: MetaParams, settings: Settings): MetaResult {
        return { name: 'Jira', mentions: {} }
    },

    async mentions(params: MentionsParams, settings: Settings): Promise<MentionsResult> {
        const result = (issue: JiraIssue) => ({
            title: `${issue.key}: ${issue.fields.summary}`,
            uri: issue.url,
            description: issue.fields.description,
            data: {
                issue: issue,
            },
        })

        if (params.query) {
            return searchIssues(params.query, settings).then(issues => issues.map(result))
        }

        return fetchRecentIssues(settings).then(issues => issues.map(result))
    },

    items(params: ItemsParams, settings: Settings): ItemsResult {
        const issue = params.mention?.data?.issue as JiraIssue
        return [
            {
                title: issue.key,
                url: issue.url,
                ai: {
                    content: issueToItemContent(issue),
                },
            },
        ]
    },
}

export default jiraProvider
