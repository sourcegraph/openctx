import type { Mention, MetaResult, Provider } from '@openctx/provider'
import { GithubClient } from './client.js'
import { type Issue, fetchIssue, getIssueItems } from './issue.js'
import { type PR, fetchPR, getPullRequestItems } from './pr.js'
import type { Settings } from './settings.js'

export const githubProvider: Provider<Settings> = {
    meta(): MetaResult {
        return {
            name: 'Github PRs & Issues',
            mentions: {},
        }
    },

    async mentions({ query }, settings) {
        if (!query) {
            return []
        }

        const details = parseQuery(query)
        if (!details) {
            return []
        }

        const { owner, repoName, number } = details

        if (!owner || !repoName) {
            return []
        }

        const githubClient = new GithubClient({
            accessToken: settings.accessToken,
            baseURL: settings.baseURL,
        })

        const [issue, pr] = await Promise.all([
            fetchIssue(githubClient, owner, repoName, number),
            fetchPR(githubClient, owner, repoName, number),
        ])

        if (issue) {
            return getIssueMentions(owner, repoName, issue)
        }

        if (pr) {
            return getPRMentions(owner, repoName, pr)
        }

        return []
    },

    async items({ mention }, settings) {
        if (!mention) {
            return []
        }

        if (!mention.data?.owner || typeof mention.data?.owner !== 'string') {
            return []
        }
        if (!mention.data?.repoName || typeof mention.data?.repoName !== 'string') {
            return []
        }

        const owner = mention.data.owner
        const repoName = mention.data.repoName

        const githubClient = new GithubClient({
            accessToken: settings.accessToken,
            baseURL: settings.baseURL,
        })

        if (mention.data.pr) {
            return getPullRequestItems(githubClient, { owner, repoName, pr: mention.data.pr as PR })
        }

        if (mention.data.issue) {
            return getIssueItems(githubClient, { owner, repoName, issue: mention.data.issue as Issue })
        }

        return []
    },
}

/** parseQuery parses a given user input and tries to extract the repo details and
 * item number from it.
 * Supported formats:
 * - https://github.com/sourcegraph/sourcegraph/issues/1234
 * - https://github.com/sourcegraph/sourcegraph/pull/1234
 * - https://ghe.example.com/sourcegraph/sourcegraph/pull/1234
 * - github.com/sourcegraph/sourcegraph/issues/1234
 * - ghe.example.com/sourcegraph/sourcegraph/issues/1234
 * - sourcegraph/sourcegraph/issues/1234
 * - sourcegraph/sourcegraph:1234
 */
export function parseQuery(query = ''): { owner: string; repoName: string; number: number } | null {
    try {
        // Try to parse as a URL.
        const url = new URL(query)
        if (url.pathname.startsWith('/')) {
            // If the URL has a pathname, it's probably a GitHub URL.
            const [_, owner, repoName, kind, numberText] = url.pathname.split('/')
            if (!['issues', 'pull'].includes(kind)) {
                return null
            }
            return { owner, repoName, number: parseInt(numberText) }
        }
    } catch {
        let [_, owner, repoName, kind, numberText] = query.split('/')
        if (!numberText) {
            ;[owner, repoName, kind, numberText] = query.split('/')
        }
        if (!['issues', 'pull'].includes(kind)) {
            if (query.includes(':')) {
                const [owner, repoName] = query.substring(0, query.lastIndexOf(':')).split('/')
                const [_, numberText] = query.split(':')
                return { owner, repoName, number: parseInt(numberText) }
            }
            return null
        }
        return { owner, repoName, number: parseInt(numberText) }
    }

    return null
}

function getIssueMentions(owner: string, repoName: string, issue: Issue): Mention[] {
    return [
        {
            uri: issue.html_url,
            title: `#${issue.number} ${issue.title}`,
            description: issue.body ?? undefined,
            data: {
                owner,
                repoName,
                issue,
            },
        },
    ]
}

function getPRMentions(owner: string, repoName: string, pr: PR): Mention[] {
    return [
        {
            uri: pr.html_url,
            title: `#${pr.number} ${pr.title}`,
            description: pr.body ?? undefined,
            data: {
                owner,
                repoName,
                pr,
            },
        },
    ]
}
