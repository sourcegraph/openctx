import type {
    ItemsParams,
    ItemsResult,
    MentionsParams,
    MentionsResult,
    MetaResult,
} from '@openctx/provider'
import { getSentryAccessToken } from './auth.js'
import { type Issue, fetchIssue } from './sentryapi.js'
import type { Settings } from './settings.js'

/**
 * An OpenCtx provider that fetches the content of a Sentry issue by URL and provides it as an item.
 */
export const providerImplementation = {
    meta(): MetaResult {
        return {
            // We don't provide any annotations for now.
            name: 'Sentry Issues',
            mentions: { label: 'Paste a URL...' },
            annotations: {
                selectors: [],
            },
        }
    },

    async mentions(params: MentionsParams, settings: Settings): Promise<MentionsResult> {
        // If no input, bail early.
        if (params.query === undefined || params.query.length === 0) {
            return []
        }

        const accessToken = await getSentryAccessToken(settings)
        if (accessToken === null) {
            throw new Error(
                'Must provide a Sentry API token in the `apiToken` settings field, or a path to a file with the token in the `apiTokenPath` settings field.',
            )
        }

        // Try to parse the user input as a Sentry URL.
        const parsed = parseSentryURL(params.query)
        if (parsed === null) {
            // Not a valid sentry issue URL, bail.
            return []
        }

        const { organizationId, issueId } = parsed

        const issue = await fetchIssue(accessToken, organizationId, issueId)
        if (!issue) {
            // Nothing found, bail.
            return []
        }

        return [
            {
                title: `Sentry issue: ${issue.title}`,
                uri: issue.permalink,
                data: {
                    // We store the issue in the mention data, so we can retrieve it
                    // again when compiling items from it, without talking to the API
                    // again.
                    issue: issue,
                },
            },
        ]
    },

    async items(params: ItemsParams): Promise<ItemsResult> {
        // If there is no issue in the context, we can't build any context.
        if (params.mention?.data?.issue === undefined) {
            return []
        }

        const issue = params.mention.data.issue as Issue
        if (!issue) {
            return []
        }

        return [
            {
                title: `Sentry issue ${issue.shortId}`,
                ai: { content: formatIssueForLLM(issue) },
                ui: { hover: { text: issue.title } },
                url: issue.permalink,
            },
        ]
    },
}

/**
 * parseSentryURL tries to parse the input as a URL to Sentry. If successful, it
 * will return the meta info from the URL, otherwise null.
 *
 * @param input The potential URL string to parse.
 */
export function parseSentryURL(input: string): { organizationId: string; issueId: string } | null {
    // Example format https://sourcegraph.sentry.io/issues/1234567890/?project=1234567&query=is%3Aunresolved+issue.priority%3A%5Bhigh%2C+medium%5D&referrer=issue-stream&statsPeriod=14d&stream_index=0
    try {
        const url = new URL(input)
        if (!url.hostname.includes('.sentry.io')) {
            // Not a sentry URL.
            return null
        }
        const organizationId = url.hostname.split('.')[0]
        const issueId = url.pathname.split('/')[2]
        if (organizationId === '' || issueId === '') {
            return null
        }
        return {
            organizationId,
            issueId,
        }
    } catch {
        return null
    }
}

/** formatIssueForLLM is a function generated by Cody to include all the necessary details about an issue for consumption by an LLM. */
export function formatIssueForLLM(issue: Issue): string {
    const lines = [
        `Here's some information on Sentry issue: ${issue.shortId} that I provided as part of the context:`,
        `Title: ${issue.title}`,
        `Culprit: ${issue.culprit}`,
        `Level: ${issue.level}`,
        `Status: ${issue.status}`,
        `First Seen: ${issue.firstSeen}`,
        `Last Seen: ${issue.lastSeen}`,
        `Count: ${issue.count}`,
        `Permalink: ${issue.permalink}`,
        `Logger: ${issue.logger || 'N/A'}`,
    ]

    if (issue.metadata) {
        if ('filename' in issue.metadata) {
            lines.push(`Filename: ${issue.metadata.filename}`)
            lines.push(`Type: ${issue.metadata.type}`)
            lines.push(`Value: ${issue.metadata.value}`)
        } else if ('title' in issue.metadata) {
            lines.push(`Metadata Title: ${issue.metadata.title}`)
        }
    }

    return lines.join('\n')
}
