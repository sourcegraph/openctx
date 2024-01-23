
// Sentry event
export interface WebEvent {
    id: string
    title: string
    message: string
    platform: string
    user: string
    eventID: string
    groupID: string
    type: string                    // event.type
    tags?: Array<any>
}

// Sentry issue
export interface WebIssue {
    annotations: []
    count: number
    level: string
    culprit: string
    public: boolean                 // isPublic
    subscribed: boolean             // isSubscribed
    assignee: string                // assignedTo
}

// Sentry project
export interface WebProject {
    id: string
    slug: string
    name: string
    platform: string
    features: Array<string>
    created: string                 // dateCreated
    member: boolean                 // isMember
    bookmarked: boolean             // isBookmarked
}

// Sentry organization
export interface WebOrganization {
    id: string
    name: string
    slug: string
    default: boolean                // isDefault
    earlyAdopter: boolean           // isEarlyAdopter
    access: Array<string>
    allowSharedIssues: boolean
    openMembership: true
    projects: Array<any>
}