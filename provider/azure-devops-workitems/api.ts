import striptags from 'striptags'
import type { Settings } from './index.ts'
import type { AzDevArrayResponse, WorkItem, WorkItemQueryResult } from './types.js'

const DEFAULT_API_VERSION = '5.0'
const NUMBER_OF_ISSUES_TO_FETCH = 10
const WorkItemFields = {
    AssignedTo: 'System.AssignedTo',
    Id: 'System.Id',
    Title: 'System.Title',
    Description: 'System.Description',
    WorkItemType: 'System.WorkItemType',
    State: 'System.State',
    Tags: 'System.Tags',
}

export interface MinimalWorkItem {
    id: string
    title: string
    description: string
    url: string
}

export interface SimpleWorkItem {
    id: string
    url: string
    fields: {
        title: string
        state: string
        type: string
        assignedTo: string
        description: string
        tags: string[]
    }
}

const authHeaders = (settings: Settings) => ({
    Authorization: `Basic ${Buffer.from(`:${settings.accessToken}`).toString('base64')}`,
    'content-type': 'application/json',
})

const buildUrl = (settings: Settings, path: string, searchParams: Record<string, string> = {}) => {
    // Avoid double / if settings.url ends with '/' and path starts with '/'
    const url = new URL(settings.url.replace(/\/$/, '') + path)
    url.search = new URLSearchParams(searchParams).toString()
    return url
}

export const searchWorkItems = async (
    query: string | undefined,
    settings: Settings
): Promise<MinimalWorkItem[]> => {
    let searchId = Number(query)
    if (Number.isNaN(searchId)) {
        searchId = 0
    }
    const wiql = query
        ? `SELECT  [System.Id]
FROM workitems
WHERE ([System.Title] Contains '${query}' OR [System.Description] Contains '${query}' OR [System.Id] = ${searchId})
ORDER BY [System.ChangedDate] DESC
`
        : `SELECT  [System.Id]
FROM workitems
WHERE ([System.AssignedTo] = @Me OR [System.CreatedBy] = @Me OR [System.ChangedBy] = @Me)
ORDER BY [System.ChangedDate] DESC
`

    const queryUrl = buildUrl(settings, '/_apis/wit/wiql', {
        'api-version': DEFAULT_API_VERSION,
        $top: `${NUMBER_OF_ISSUES_TO_FETCH}`,
    })
    console.log(`Calling Azure DevOps API: ${queryUrl}`)
    const queryResponse = await fetch(queryUrl, {
        method: 'POST',
        headers: authHeaders(settings),
        body: JSON.stringify({
            query: wiql,
        }),
    })
    if (!queryResponse.ok) {
        throw new Error(
            `Error fetching Azure DevOps query (${queryResponse?.status} ${
                queryResponse?.statusText
            }): ${await queryResponse?.text()}`
        )
    }

    const queryResult = (await queryResponse.json()) as WorkItemQueryResult

    if (queryResult?.workItems?.length) {
        // Query the ids and get the work items
        const workItemIds = queryResult.workItems
            .map(w => w.id)
            .filter(id => id !== undefined) as number[]

        const fields = [
            WorkItemFields.Id,
            WorkItemFields.Title,
            WorkItemFields.WorkItemType,
            WorkItemFields.Description,
        ]
        const wiUrl = buildUrl(settings, '/_apis/wit/workitems', {
            'api-version': DEFAULT_API_VERSION,
            fields: fields.join(','),
            ids: workItemIds.join(','),
        })
        console.log(`Calling Azure DevOps API: ${wiUrl}`)
        const workItemsResponse = await fetch(wiUrl, {
            method: 'GET',
            headers: authHeaders(settings),
        })

        if (!workItemsResponse.ok) {
            throw new Error(
                `Error fetching Azure DevOps work items (${workItemsResponse?.status} ${
                    workItemsResponse?.statusText
                }): ${await workItemsResponse?.text()}`
            )
        }

        const workItems = (await workItemsResponse.json()) as AzDevArrayResponse<WorkItem>

        return (
            workItems?.value?.map(item => {
                const workItemId = item.id?.toString() ?? ''
                const { type, title, description } = getWorkItemData(item?.fields)
                return {
                    id: workItemId,
                    description: description,
                    title: `[${type} ${workItemId}] ${title}`,
                    url: buildUrl(settings, `/_workitems/edit/${workItemId}`).toString(),
                }
            }) || []
        )
    }
    return []
}

export const fetchWorkItem = async (
    workItemId: string | number,
    settings: Settings
): Promise<SimpleWorkItem | null> => {
    const fields = [
        WorkItemFields.Id,
        WorkItemFields.Title,
        WorkItemFields.WorkItemType,
        WorkItemFields.State,
        WorkItemFields.AssignedTo,
        WorkItemFields.Tags,
        WorkItemFields.Description,
    ]

    const url = buildUrl(settings, `/_apis/wit/workitems/${workItemId}`, {
        'api-version': DEFAULT_API_VERSION,
        fields: fields.join(','),
    })

    console.log(`Calling Azure DevOps API: ${url}`)
    const workItemResponse = await fetch(url, {
        method: 'GET',
        headers: authHeaders(settings),
    })

    if (!workItemResponse.ok) {
        throw new Error(
            `Error fetching Azure DevOps work item (${workItemResponse?.status} ${
                workItemResponse?.statusText
            }): ${await workItemResponse?.text()}`
        )
    }

    const workItem = (await workItemResponse.json()) as WorkItem

    const { type, title, tags, description, state, assignedTo } = getWorkItemData(workItem?.fields)

    return {
        id: String(workItemId),
        fields: {
            description: description,
            tags: tags.split(';'),
            title: `[${type} ${workItemId}] ${title}`,
            state: state,
            assignedTo: assignedTo,
            type: type,
        },
        url: buildUrl(settings, `/_workitems/edit/${workItemId}`).toString(),
    }
}

function getWorkItemData(fields?: { [key: string]: any }) {
    const type = fields?.[WorkItemFields.WorkItemType] ?? ''
    const title = fields?.[WorkItemFields.Title] ?? ''
    const state = fields?.[WorkItemFields.State] ?? ''
    const assignedTo =
        fields?.[WorkItemFields.AssignedTo]?.displayName ??
        fields?.[WorkItemFields.AssignedTo]?.uniqueName ??
        ''
    const description = striptags(fields?.[WorkItemFields.Description] ?? '')
    const tags = fields?.[WorkItemFields.Tags] ?? ''
    return { type, title, state, assignedTo, tags, description }
}
