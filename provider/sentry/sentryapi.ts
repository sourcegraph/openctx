// Autogenerated by Cody from the JSON schema at https://docs.sentry.io/api/events/retrieve-an-issue/.
export interface Issue {
    activity: {
        data: object
        dateCreated: string
        id: string
        type: string
        user: object | null
    }[]
    annotations: string[]
    assignedTo: object | null
    count: string
    culprit: string
    firstRelease: {
        authors: string[]
        commitCount: number
        data: object | null
        dateCreated: string
        dateReleased: string | null
        deployCount: number
        firstEvent: string
        lastCommit: string | null
        lastDeploy: string | null
        lastEvent: string
        newGroups: number
        owner: string | null
        projects: {
            name: string
            slug: string
        }[]
        ref: string | null
        shortVersion: string
        url: string | null
        version: string
    } | null
    firstSeen: string
    hasSeen: boolean
    id: string
    isBookmarked: boolean
    isPublic: boolean
    isSubscribed: boolean
    lastRelease: object | null
    lastSeen: string
    level: string
    logger: string | null
    metadata:
        | {
              filename: string
              type: string
              value: string
          }
        | {
              title: string
          }
    numComments: number
    participants: object[]
    permalink: string
    pluginActions: string[][]
    pluginContexts: string[]
    pluginIssues: object[]
    project: {
        id: string
        name: string
        slug: string
    }
    seenBy: object[]
    shareId: string | null
    shortId: string
    stats: {
        '24h': number[][]
        '30d': number[][]
    }
    status: 'resolved' | 'unresolved' | 'ignored'
    statusDetails: object
    subscriptionDetails: object | null
    tags: object[]
    title: string
    type: string
    userCount: number
    userReportCount: number
}

/**
 * fetchIssue fetches the given issue from Sentry. It returns `null` when the issue
 * can not be found.
 *
 * @param sentryToken An API token with event:read, project:read scopes.
 * @param organizationId The ID of the organization to fetch the issue for.
 * @param issueId The ID of the issue to retrieve.
 * @param timeoutMS An optional timeout for the HTTP request. Defaults to 5s.
 * @returns The issue, or null if not found.
 */
export async function fetchIssue(
    sentryToken: string,
    organizationId: string,
    issueId: string,
    timeoutMS = 5000,
): Promise<Issue | null> {
    const abortController = new AbortController()
    setTimeout(() => abortController.abort(), timeoutMS)

    const resp = await fetch(
        `https://sentry.io/api/0/organizations/${organizationId}/issues/${issueId}/`,
        {
            headers: {
                Authorization: `Bearer ${sentryToken}`,
            },
            signal: abortController.signal,
        },
    )
    if (!resp.ok) {
        if (resp.status === 404) {
            return null
        }
        throw new Error(
            `Failed to fetch issue ${issueId} from ${organizationId}: ${resp.status} ${resp.statusText}`,
        )
    }
    return (await resp.json()) as Issue
}
