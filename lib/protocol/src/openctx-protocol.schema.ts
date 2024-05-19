import type { Annotation, Item } from '@openctx/schema'
/**
 * OpenCtx client/provider protocol
 */
export type Protocol =
    | RequestMessage
    | ResponseMessage
    | ResponseError
    | ProviderSettings
    | MetaParams
    | MetaResult
    | Mention
    | MentionsParams
    | MentionsResult
    | ItemsParams
    | ItemsResult
    | AnnotationsParams
    | AnnotationsResult
export type MetaParams = Record<string, never>
export type MentionsResult = Mention[]
export type ItemsResult = Item[]
export type AnnotationsResult = Annotation[]

export interface RequestMessage {
    method: string
    params?: unknown
    settings?: ProviderSettings
}
/**
 * User settings sent by the client to the provider.
 */
export interface ProviderSettings {
    [k: string]: unknown | undefined
}
export interface ResponseMessage {
    result?: unknown
    error?: ResponseError
}
export interface ResponseError {
    code: number
    message: string
    data?: unknown
}
export interface MetaResult {
    /**
     * Selects the scope in which this provider should be called.
     *
     * At least 1 must be satisfied for the provider to be called. If empty, the provider is never called. If undefined, the provider is called on all resources.
     */
    selector?: Selector[]
    meta: {
        /**
         * The name of the provider.
         */
        name: string
        /**
         * A description of the provider.
         */
        description?: string
    }
}
/**
 * Defines a scope in which a provider is called.
 *
 * To satisfy a selector, all of the selector's conditions must be met. For example, if both `path` and `content` are specified, the resource must satisfy both conditions.
 */
export interface Selector {
    /**
     * A glob that must match the resource's hostname and path.
     *
     * Use `** /` before the glob to match in any parent directory. Use `/**` after the glob to match any resources under a directory. Leading slashes are stripped from the path before being matched against the glob.
     */
    path?: string
    /**
     * A literal string that must be present in the resource's content.
     */
    contentContains?: string
}
/**
 * A mention contains presentation information relevant to a resource.
 */
export interface Mention {
    /**
     * A descriptive title.
     */
    title: string
    /**
     * A URI for the mention item.
     */
    uri: string
    data?: {
        [k: string]: unknown | undefined
    }
}
export interface MentionsParams {
    /**
     * A search query that is interpreted by providers to filter the items in the result set.
     */
    query?: string
}
export interface ItemsParams {
    /**
     * A message that is interpreted by providers to return relevant items.
     */
    message?: string
    /**
     * A mention interpreted by providers to return items for the specified mention.
     */
    mention?: Mention
}
export interface AnnotationsParams {
    /**
     * The resource's URI.
     */
    uri: string
    /**
     * The resource's content.
     */
    content: string
}
