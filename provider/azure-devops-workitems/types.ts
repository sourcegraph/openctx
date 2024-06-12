export interface WorkItemReference {
    id?: number
    url?: string
}
export interface WorkItemQueryResult {
    workItems?: WorkItemReference[]
}
export interface WorkItemRelation {
    attributes?: {
        [key: string]: any
    }
    rel?: string
    url?: string
}

export interface WorkItem {
    fields?: {
        [key: string]: any
    }
    id?: number
    relations?: WorkItemRelation[]
    rev?: number
}

export interface AzDevArrayResponse<T> {
    count: number
    value: T[]
}
