import type { Settings } from './index.ts'
import type { WorkItem, WorkItemQueryResult } from './types.js'

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
    const wiql = query
        ? `SELECT  [System.Id]
FROM workitems
WHERE ([System.Title] Contains '${query}' OR [System.Description]  Contains '${query}')
ORDER BY [System.ChangedDate] DESC
`
        : `SELECT  [System.Id]
FROM workitems
WHERE ([System.AssignedTo] = @Me OR [System.CreatedBy] = @Me OR [System.ChangedBy] = @Me)
ORDER BY [System.ChangedDate] DESC
`
    const queryResponse = await fetch(
        buildUrl(settings, '_apis/wit/wiql', {
            query: wiql,
            'api-version': DEFAULT_API_VERSION,
            $top: `${NUMBER_OF_ISSUES_TO_FETCH}`,
        }),
        {
            method: 'POST',
            headers: authHeaders(settings),
        }
    )
    if (!queryResponse.ok) {
        throw new Error(
            `Error fetching Azure DevOps query (${queryResponse.status} ${
                queryResponse.statusText
            }): ${await queryResponse.text()}`
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

        const workItemsResponse = await fetch(
            buildUrl(settings, '_apis/wit/workitems', {
                'api-version': DEFAULT_API_VERSION,
                fields: fields.join(','),
                ids: workItemIds.join(','),
            }),
            {
                method: 'GET',
                headers: authHeaders(settings),
            }
        )

        if (!workItemsResponse.ok) {
            throw new Error(
                `Error fetching Azure DevOps work items (${workItemsResponse.status} ${
                    workItemsResponse.statusText
                }): ${await workItemsResponse.text()}`
            )
        }

        const workItems = (await workItemsResponse.json()) as WorkItem[]

        return (
            workItems?.map(item => {
                const workItemId = item.id?.toString() ?? ''
                const { type, title, description } = getWorkItemData(item?.fields)
                return {
                    id: workItemId,
                    description: description,
                    title: `[${type}] ${title}`,
                    url: buildUrl(settings, `/_workitems/edit/${workItemId}`).toString(),
                }
            }) || []
        )
    }

    return []
}

export const fetchWorkItem = async (
    workItemId: string,
    settings: Settings
): Promise<SimpleWorkItem | null> => {
    // Remove a potential AB# prefix from workItemId
    const itemId = workItemId.replace('AB#', '')

    const fields = [
        WorkItemFields.Id,
        WorkItemFields.Title,
        WorkItemFields.WorkItemType,
        WorkItemFields.State,
        WorkItemFields.AssignedTo,
        WorkItemFields.Tags,
        WorkItemFields.Description,
    ]

    const workItemResponse = await fetch(
        buildUrl(settings, `_apis/wit/workitems/${itemId}`, {
            'api-version': DEFAULT_API_VERSION,
            fields: fields.join(','),
        }),
        {
            method: 'GET',
            headers: authHeaders(settings),
        }
    )

    if (!workItemResponse.ok) {
        throw new Error(
            `Error fetching Azure DevOps work item (${workItemResponse.status} ${
                workItemResponse.statusText
            }): ${await workItemResponse.text()}`
        )
    }

    const workItem = (await workItemResponse.json()) as WorkItem

    const { type, title, tags, description, state, assignedTo } = getWorkItemData(workItem?.fields)

    return {
        id: itemId,
        fields: {
            description: description,
            tags: tags.split(';'),
            title: `[${type}] ${title}`,
            state: state,
            assignedTo: assignedTo,
            type: type,
        },
        url: buildUrl(settings, `/_workitems/edit/${itemId}`).toString(),
    }
}
function getWorkItemData(fields?: { [key: string]: any }) {
    const type = fields?.[WorkItemFields.WorkItemType] ?? ''
    const title = fields?.[WorkItemFields.Title] ?? ''
    const state = fields?.[WorkItemFields.State] ?? ''
    const assignedTo = fields?.[WorkItemFields.AssignedTo] ?? ''
    const description = fields?.[WorkItemFields.Description] ?? ''
    const tags = fields?.[WorkItemFields.Tags] ?? ''
    return { type, title, state, assignedTo, tags, description }
}
