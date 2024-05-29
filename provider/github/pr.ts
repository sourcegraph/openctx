import type { components } from '@octokit/openapi-types'
import type { ItemsResult } from '@openctx/provider'
import { XMLBuilder } from 'fast-xml-parser'
import type { GithubClient } from './client.js'

export type PR = components['schemas']['pull-request']

export async function fetchPR(
    githubClient: GithubClient,
    owner: string,
    repoName: string,
    number: number
): Promise<PR | null> {
    try {
        const pr = await githubClient.request('GET /repos/{owner}/{repo}/pulls/{pull_number}', {
            owner,
            repo: repoName,
            pull_number: number,
        })
        return pr
    } catch {
        return null
    }
}

const xmlBuilder = new XMLBuilder({
    format: true,
})

export async function getPullRequestItems(
    client: GithubClient,
    { owner, repoName, pr }: { owner: string; repoName: string; pr: PR }
): Promise<ItemsResult> {
    const [diff, comments, reviewComments] = await Promise.all([
        client
            .request('GET /repos/{owner}/{repo}/pulls/{pull_number}', {
                owner: owner,
                repo: repoName,
                pull_number: pr.number,
                mediaType: {
                    format: 'diff',
                },
            })
            .catch(() => ''),
        client
            .request('GET /repos/{owner}/{repo}/issues/{issue_number}/comments', {
                owner: owner,
                repo: repoName,
                issue_number: pr.number,
                per_page: 100,
            })
            .catch(() => []),
        client
            .request('GET /repos/{owner}/{repo}/pulls/{pull_number}/comments', {
                owner: owner,
                repo: repoName,
                pull_number: pr.number,
                per_page: 100,
            })
            .catch(() => []),
    ])

    const content = xmlBuilder.build({
        pull_request: {
            url: pr.html_url,
            title: `#${pr.number} ${pr.title}`,
            branch: pr.head.ref,
            author: pr.user.login,
            created_at: pr.created_at,
            merged: pr.merged,
            merged_at: pr.merged_at,
            mergeable: pr.mergeable,
            status: pr.state,
            body: pr.body,
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
            url: pr.html_url,
            title: pr.title,
            ai: { content },
        },
    ]
}
