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
    url: string
    email: string
    apiToken: string
}

const checkSettings = (settings: Settings) => {
    const missingKeys = ['url', 'email', 'apiToken'].filter(key => !(key in settings))
    if (missingKeys.length > 0) {
        throw new Error(`Missing settings: ${JSON.stringify(missingKeys)}`)
    }
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
            `The following represents contents of the JIRA issue ${issue.key}: ` +
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
        return { name: 'Jira Issues', mentions: { label: 'Search by name, id or paste a URL...' } }
    },

    async mentions(params: MentionsParams, settings: Settings): Promise<MentionsResult> {
        checkSettings(settings)

        // Uses the quick REST picker API to fuzzy match potential items
        return searchIssues(params.query, settings).then(items =>
            items.map(item => ({
                title: item.key,
                uri: item.url,
                description: item.summaryText,
                data: { key: item.key },
            }))
        )
    },

    async items(params: ItemsParams, settings: Settings): Promise<ItemsResult> {
        checkSettings(settings)

        const key = (params.mention?.data as { key: string }).key

        const issue = await fetchIssue(key, settings)

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
