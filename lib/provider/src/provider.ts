import type {
    AnnotationsParams,
    AnnotationsResult,
    CapabilitiesParams,
    CapabilitiesResult,
    ItemsParams,
    ItemsResult,
    ProviderSettings,
} from '@openctx/protocol'

/**
 * An OpenCtx provider implemented in TypeScript/JavaScript.
 *
 * @template S The type of provider settings.
 */
export interface Provider<S extends {} = ProviderSettings> {
    /**
     * Reports the capabilities of the provider.
     */
    capabilities(
        params: CapabilitiesParams,
        settings: S
    ): CapabilitiesResult | Promise<CapabilitiesResult>

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
