import type {
    ItemsParams,
    ItemsResult,
    MentionsParams,
    MentionsResult,
    MetaParams,
    MetaResult,
    Provider,
} from '@openctx/provider'
import { type JiraIssue, fetchLatestJiraTickets, issueUrl } from './api.js'

export type Settings = {
    host: string
    port?: string
    username: string
    apiToken: string
}

const jiraProvider: Provider = {
    meta(params: MetaParams, settings: Settings): MetaResult {
        return { name: 'Jira', features: { mentions: true } }
    },

    async mentions(params: MentionsParams, settings: Settings): Promise<MentionsResult> {
        // if (!params.query) {
        return fetchLatestJiraTickets(settings).then(issues =>
            issues.map(issue => ({
                title: `${issue.key} ${issue.fields.summary}`,
                uri: issueUrl(settings, issue),
                data: {
                    issue: issue,
                },
            }))
        )
        // }
        // todo: else search
    },

    items(params: ItemsParams, settings: Settings): ItemsResult {
        const issue = params.mention?.data?.issue as JiraIssue
        return [
            {
                title: issue.key,
                url: issueUrl(settings, issue),
                ai: {
                    content: issue.fields?.description,
                },
            },
        ]
    },
}

export default jiraProvider
