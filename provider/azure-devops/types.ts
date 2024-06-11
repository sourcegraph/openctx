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
    /**
     * Relations of the work item.
     */
    relations?: WorkItemRelation[]
    /**
     * Revision number of the work item.
     */
    rev?: number
}
