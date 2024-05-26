import type {
    ItemsResult,
    Mention,
    MetaParams,
    MetaResult,
    Provider,
    ProviderSettings,
} from '@openctx/provider'
import { XMLBuilder } from 'fast-xml-parser'
import { GithubClient } from './client.js'

type GithubProviderSettings = ProviderSettings & {
    accessToken: string
}

const xmlBuilder = new XMLBuilder({
    format: true,
})

const github: Provider<GithubProviderSettings> = {
    meta(params: MetaParams, settings: ProviderSettings): MetaResult {
        return { name: 'Github PRs & Issues', features: { mentions: true } }
    },

    async mentions({ query }, settings) {
        if (!query) {
            return []
        }

        const details = parseQuery(query)
        if (!details) {
            return []
        }

        const { owner, repoName, number, kind } = details
        const githubClient = new GithubClient({ accessToken: settings.accessToken })

        if (!owner || !repoName) {
            return []
        }

        switch (kind) {
            case 'issue':
            case 'issues':
                return getIssueMentions(githubClient, { owner, repoName, issueNumber: number })
            case 'pr':
            case 'pull':
            case 'pulls':
                return getPullRequestMentions(githubClient, { owner, repoName, pullNumber: number })
            default:
                return []
        }
    },

    async items({ message, mention }, settings) {
        console.log(mention)
        if (!message && !mention?.uri) {
            return []
        }

        const details = mention?.uri ? parseMentionUri(mention.uri) : parseQuery(message)
        console.log(details)
        if (!details) {
            return []
        }

        const { owner, repoName, number, kind } = details
        const githubClient = new GithubClient({ accessToken: settings.accessToken })

        if (!owner || !repoName || !number) {
            return []
        }

        switch (kind) {
            case 'issue':
            case 'issues':
                return getIssueItems(githubClient, { owner, repoName, issueNumber: number })
            case 'pr':
            case 'pull':
            case 'pulls':
                return getPullRequestItems(githubClient, { owner, repoName, pullNumber: number })
            default:
                return []
        }
    },
}

function parseMentionUri(
    uri: string
): { owner?: string; repoName?: string; number?: number; kind: string } | null {
    const url = new URL(uri)
    if (url.hostname !== 'github.com') {
        return null
    }

    // "https://github.com/sourcegraph/openctx/pull/1234",
    const [_, owner, repoName, kind, numberText] = url.pathname.split('/')

    if (!['issues', 'pull'].includes(kind)) {
        return null
    }

    const number = numberText ? Number(numberText) : undefined
    if (Number.isNaN(number)) {
        return null
    }

    return { owner, repoName, number, kind }
}

function parseQuery(
    query = ''
): { owner?: string; repoName?: string; number?: number; kind: string } | null {
    /* supported query formats:
     * - github:issue:1234
     * - github:issue:sourcegraph/cody/1234
     */
    const [kind = '', id = ''] = query.split(':')

    if (!['issue', 'pr', 'pull'].includes(kind)) {
        return null
    }

    const [owner, repoName, numberText] = id.split('/')

    const number = numberText ? Number(numberText) : undefined
    if (Number.isNaN(number)) {
        return null
    }

    return { owner, repoName, number, kind }
}

async function getPullRequestMentions(
    client: GithubClient,
    params: {
        owner: string
        repoName: string
        pullNumber?: number
    }
): Promise<Mention[]> {
    try {
        const pullRequests = params.pullNumber
            ? [
                  await client.request('GET /repos/{owner}/{repo}/pulls/{pull_number}', {
                      owner: params.owner,
                      repo: params.repoName,
                      pull_number: params.pullNumber,
                  }),
              ]
            : await client.request('GET /repos/{owner}/{repo}/pulls', {
                  owner: params.owner,
                  repo: params.repoName,
                  per_page: 10,
              })

        return pullRequests.map(
            pullRequest =>
                ({
                    uri: pullRequest.html_url,
                    title: `#${pullRequest.number} ${pullRequest.title}`,
                }) as Mention
        )
    } catch (error) {
        return []
    }
}

async function getIssueMentions(
    client: GithubClient,
    params: {
        owner: string
        repoName: string
        issueNumber?: number
    }
): Promise<Mention[]> {
    try {
        const issues = params.issueNumber
            ? [
                  await client.request('GET /repos/{owner}/{repo}/issues/{issue_number}', {
                      owner: params.owner,
                      repo: params.repoName,
                      issue_number: params.issueNumber,
                  }),
              ]
            : await client.request('GET /issues', {
                  per_page: 10,
                  pulls: false,
              })

        return issues.map(
            issue =>
                ({
                    uri: issue.html_url,
                    title: `#${issue.number} ${issue.title}`,
                }) as Mention
        )
    } catch (error) {
        return []
    }
}

async function getPullRequestItems(
    client: GithubClient,
    details: { owner: string; repoName: string; pullNumber: number }
): Promise<ItemsResult> {
    try {
        const pullRequest = await client.request('GET /repos/{owner}/{repo}/pulls/{pull_number}', {
            owner: details.owner,
            repo: details.repoName,
            pull_number: details.pullNumber,
        })

        if (!pullRequest) {
            return []
        }

        const [diff, comments, reviewComments] = await Promise.all([
            client
                .request('GET /repos/{owner}/{repo}/pulls/{pull_number}', {
                    owner: details.owner,
                    repo: details.repoName,
                    pull_number: details.pullNumber,
                    mediaType: {
                        format: 'diff',
                    },
                })
                .catch(() => ''),
            client
                .request('GET /repos/{owner}/{repo}/issues/{issue_number}/comments', {
                    owner: details.owner,
                    repo: details.repoName,
                    issue_number: details.pullNumber,
                    per_page: 100,
                })
                .catch(() => []),
            client
                .request('GET /repos/{owner}/{repo}/pulls/{pull_number}/comments', {
                    owner: details.owner,
                    repo: details.repoName,
                    pull_number: details.pullNumber,
                    per_page: 100,
                })
                .catch(() => []),
        ])

        const content = xmlBuilder.build({
            pull_request: {
                url: pullRequest.html_url,
                title: `#${pullRequest.number} ${pullRequest.title}`,
                branch: pullRequest.head.ref,
                author: pullRequest.user.login,
                created_at: pullRequest.created_at,
                merged: pullRequest.merged,
                merged_at: pullRequest.merged_at,
                mergeable: pullRequest.mergeable,
                status: pullRequest.state,
                body: pullRequest.body,
                diff: diff,
                comments: {
                    comment: comments.map(comment => ({
                        url: comment.html_url,
                        author: comment.user?.login,
                        body: comment.body,
                        created_at: comment.created_at,
                    })),
                },
                reviews: {
                    review: reviewComments.map(review => ({
                        url: review.html_url,
                        author: review.user.login,
                        body: review.body,
                        created_at: review.created_at,
                        file_path: review.path,
                        diff: review.diff_hunk,
                    })),
                },
            },
        })

        return [
            {
                url: pullRequest.html_url,
                title: pullRequest.title,
                ai: { content },
            },
        ]
    } catch (error) {
        return []
    }
}

async function getIssueItems(
    client: GithubClient,
    details: { owner: string; repoName: string; issueNumber: number }
): Promise<ItemsResult> {
    try {
        const issue = await client.request('GET /repos/{owner}/{repo}/issues/{issue_number}', {
            owner: details.owner,
            repo: details.repoName,
            issue_number: details.issueNumber,
        })

        if (!issue) {
            return []
        }

        const comments = await client
            .request('GET /repos/{owner}/{repo}/issues/{issue_number}/comments', {
                owner: details.owner,
                repo: details.repoName,
                issue_number: details.issueNumber,
                per_page: 100,
            })
            .catch(() => [])

        const content = xmlBuilder.build({
            issue: {
                url: issue.html_url,
                title: `#${issue.number} ${issue.title}`,
                author: issue.user?.login,
                created_at: issue.created_at,
                status: issue.state,
                body: issue.body,
                comments: {
                    comment: comments.map(comment => ({
                        url: comment.html_url,
                        author: comment.user?.login,
                        body: comment.body,
                        created_at: comment.created_at,
                    })),
                },
            },
        })

        return [
            {
                ai: { content },
                url: issue.html_url,
                title: issue.title,
            },
        ]
    } catch {
        return []
    }
}

export default github
