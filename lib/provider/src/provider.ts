import type {
    AnnotationsParams,
    AnnotationsResult,
    ItemsParams,
    ItemsResult,
    MentionsParams,
    MentionsResult,
    MetaParams,
    MetaResult,
    ProviderSettings,
} from '@openctx/protocol'

/**
 * An OpenCtx provider implemented in TypeScript/JavaScript.
 *
 * @template S The type of provider settings.
 */
export interface Provider<S extends {} = ProviderSettings> {
    /**
     * Reports metadata about the provider.
     */
    meta(params: MetaParams, settings: S): MetaResult | Promise<MetaResult>

    mentions?(params: MentionsParams, settings: S): MentionsResult | Promise<MentionsResult>

    /**
     * Returns OpenCtx items.
     */
    items?(params: ItemsParams, settings: S): ItemsResult | Promise<ItemsResult>

    /**
     * Returns OpenCtx annotations for the given file.
     */
    annotations?(params: AnnotationsParams, settings: S): AnnotationsResult | Promise<AnnotationsResult>

    /**
     * Called when the provider will no longer be used. The provider should release its resources,
     * such as event listeners or background routines.
     */
    dispose?(): void
}
