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
    | MentionKind
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
     * The features supported by the provider.
     */
    features?: {
        /**
         * Configuration for the mentions feature.
         */
        mentions?: {
            /**
             * Whether the provider implements the mentions feature
             */
            implements?: boolean
            /**
             * A list of patterns matching the mention text for which the provider can return mentions
             */
            selectors?: MentionSelector[]
            /**
             * A list of kinds of  mentions the provider supports.
             */
            kinds?: MentionKind[]
        }
        /**
         * Configuration for the annotations feature.
         */
        annotations?: {
            /**
             * Whether the provider implements the mentions feature
             */
            implements?: boolean
            /**
             * A list of patterns matching the mention text for which the provider can return mentions
             */
            selectors?: AnnotationSelector[]
        }
    }
}
/**
 * A mention kind supported by the provider.
 */
export interface MentionKind {
    /**
     * The unique identifier for the mention kind.
     */
    id: string
    /**
     * The title of the mention kind.
     */
    title: string
    /**
     * The description of the mention kind.
     */
    description?: string
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
    /**
     * The id of the mention kind to return.
     */
    kind?: string
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
