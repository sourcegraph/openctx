import type {
    Item,
    ItemsParams,
    ItemsResult,
    MentionsParams,
    MentionsResult,
    MetaParams,
    MetaResult,
    Provider,
} from '@openctx/provider'
import { type Issue, fetchIssue, searchIssues } from './api.js'

export type Settings = {
    host: string
    port?: string
    username: string
    apiToken: string
}

type MentionData = {
    key: string
    url: string
}

const maxSubTasks = 10

const issueToItem = (issue: Issue): Item => ({
    url: issue.url,
    title: issue.fields.summary,
    ui: {
        hover: {
            markdown: issue.fields.description,
            text: issue.fields.description || issue.fields.summary,
        },
    },
    ai: {
        content:
            `The following JSON represents the JIRA issue ${issue.key}: ` +
            JSON.stringify({
                issue: {
                    key: issue.key,
                    summary: issue.fields.summary,
                    url: issue.url,
                    description: issue.fields.description,
                    labels: issue.fields.labels,
                    // Include high level details of the subissues on the primary issue, but their full content is included as separate items
                    relatedChildIssues: issue.fields.subtasks
                        ?.slice(0, maxSubTasks)
                        .map(item => item.key),
                },
            }),
    },
})

const jiraProvider: Provider = {
    meta(params: MetaParams, settings: Settings): MetaResult {
        return { name: 'Jira Issues', mentions: {} }
    },

    async mentions(params: MentionsParams, settings: Settings): Promise<MentionsResult> {
        // Uses the quick REST picker API to fuzzy match potential items
        return searchIssues(params.query, settings).then(items =>
            items.map(item => ({
                title: item.key,
                uri: item.url,
                description: item.summaryText,
                data: {
                    key: item.key,
                    url: item.url,
                } as MentionData,
            }))
        )
    },

    async items(params: ItemsParams, settings: Settings): Promise<ItemsResult> {
        const key = (params.mention?.data as MentionData).key
        const issue = await fetchIssue(key, settings)

        console.dir({ issue }, { depth: null })

        if (!issue) {
            return []
        }

        const subtasks = issue.fields.subtasks?.slice(0, maxSubTasks)
        if (!subtasks) {
            return [issueToItem(issue)]
        }

        const childIssues = await Promise.all(
            subtasks.map(subtask =>
                fetchIssue(subtask.key, settings).then(childIssue => {
                    return childIssue ? issueToItem(childIssue) : null
                })
            )
        )

        const items = [issueToItem(issue), ...childIssues.filter((item): item is Item => item !== null)]

        return items
    },
}

export default jiraProvider
