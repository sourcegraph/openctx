import type { components } from '@octokit/openapi-types'
import type { ItemsResult } from '@openctx/provider'
import { XMLBuilder } from 'fast-xml-parser'
import type { GithubClient } from './client.js'

export type Issue = components['schemas']['issue']

export async function fetchIssue(
    githubClient: GithubClient,
    owner: string,
    repoName: string,
    number: number
): Promise<Issue | null> {
    try {
        const issue = await githubClient.request('GET /repos/{owner}/{repo}/issues/{issue_number}', {
            owner,
            repo: repoName,
            issue_number: number,
        })
        return issue
    } catch {
        return null
    }
}

const xmlBuilder = new XMLBuilder({
    format: true,
})

export async function getIssueItems(
    client: GithubClient,
    { owner, repoName, issue }: { owner: string; repoName: string; issue: Issue }
): Promise<ItemsResult> {
    const comments = await client
        .request('GET /repos/{owner}/{repo}/issues/{issue_number}/comments', {
            owner: owner,
            repo: repoName,
            issue_number: issue.number,
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
}
