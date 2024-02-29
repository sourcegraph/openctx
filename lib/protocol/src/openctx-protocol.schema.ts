import type { Annotation, Item } from '@openctx/schema'
/**
 * OpenCtx client/provider protocol
 */
export type Protocol =
    | RequestMessage
    | ResponseMessage
    | ResponseError
    | ProviderSettings
    | CapabilitiesParams
    | CapabilitiesResult
    | ItemsParams
    | ItemsResult
    | AnnotationsParams
    | AnnotationsResult
export type CapabilitiesParams = Record<string, never>
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
export interface CapabilitiesResult {
    /**
     * Selects the scope in which this provider should be called.
     *
     * At least 1 must be satisfied for the provider to be called. If empty, the provider is never called. If undefined, the provider is called on all resources.
     */
    selector?: Selector[]
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
export interface ItemsParams {
    /**
     * A search query that is interpreted by providers to filter the items in the result set.
     */
    query?: string
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
