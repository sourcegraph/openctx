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
    | MentionSelector
    | AnnotationSelector
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
     * The name of the provider.
     */
    name: string
    /**
     * Configuration for the mentions feature.
     */
    mentions?: {
        /**
         * The label that is shown when a user wants to query mentions. For example `Search...` or `Paste Linear URL`.
         */
        label?: string
        /**
         * The list of regex patterns for triggering mentions for the provider when users directly types a matching text, for example a url, allowing the user to bypass choosing the provider manually.
         */
        selectors?: MentionSelector[]
    }
    /**
     * Configuration for the annotations feature.
     */
    annotations?: {
        /**
         * A list of patterns matching the mention text for which the provider can return mentions
         */
        selectors?: AnnotationSelector[]
    }
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
     * An optional label used to display the selected mention item in the input. For example the label can be the basename for a file whereas the title can be the whole file path used to list the item in mentions list
     */
    label?: string
    /**
     * An item description.
     */
    description?: string
    /**
     * A URI for the mention item.
     */
    uri: string
    data?: {
        [k: string]: unknown | undefined
    }
}
/**
 * List of regex patterns matching the mention text for which the provider can return mentions.
 */
export interface MentionSelector {
    /**
     * The regex pattern matching the mention text for which the provider can return mentions
     */
    pattern: string
}
/**
 * Defines a scope in which a provider is called.
 *
 * To satisfy a selector, all of the selector's conditions must be met. For example, if both `path` and `content` are specified, the resource must satisfy both conditions.
 */
export interface AnnotationSelector {
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
