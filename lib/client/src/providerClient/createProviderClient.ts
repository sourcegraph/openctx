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
import type { Provider } from '@openctx/provider'
import { scopedLogger } from '../logger.js'
import { matchSelectors } from './selector.js'
import { type ProviderTransportOptions, createTransport } from './transport/createTransport.js'

/**
 * A {@link ProviderClient} communicates with a single OpenCtx provider. It is stateless and wraps a
 * {@link ProviderTransport}.
 */
export interface ProviderClient {
    /** Get metadata about the provider. */
    meta(params: MentionsParams, settings: ProviderSettings): Promise<MetaResult>

    /** Get candidate items from the provider. */
    mentions(params: MentionsParams, settings: ProviderSettings): Promise<MentionsResult | null>

    /** Get items from the provider. */
    items(params: ItemsParams, settings: ProviderSettings): Promise<ItemsResult | null>

    /**
     * Get annotations from the provider, respecting the provider's features registered in its
     * metadata. For example, if the resource is not matched by the provider's selectors, then no
     * annotations will be returned.
     */
    annotations(params: AnnotationsParams, settings: ProviderSettings): Promise<AnnotationsResult | null>
}

export interface ProviderClientOptions
    extends Pick<
        ProviderTransportOptions,
        'providerBaseUri' | 'authInfo' | 'logger' | 'importProvider'
    > {}

/**
 * Create a new {@link ProviderClient}.
 */
export function createProviderClient(
    providerUri: string,
    { logger, ...options }: ProviderClientOptions = {},
    provider?: Provider
): ProviderClient {
    logger = scopedLogger(logger, `providerClient(${providerUri})`)

    const transport = provider || createTransport(providerUri, { ...options, cache: true, logger })

    return {
        async meta(params: MetaParams, settings: ProviderSettings): Promise<MetaResult> {
            try {
                return await transport.meta(params, settings)
            } catch (error) {
                logger?.(`failed to get meta: ${error}`)
                return Promise.reject(error)
            }
        },
        async mentions(
            params: MentionsParams,
            settings: ProviderSettings
        ): Promise<MentionsResult | null> {
            try {
                return (await transport.mentions?.(params, settings)) || null
            } catch (error) {
                logger?.(`failed to get mentions: ${error}`)
                return Promise.reject(error)
            }
        },
        async items(params: ItemsParams, settings: ProviderSettings): Promise<ItemsResult | null> {
            try {
                return (await transport.items?.(params, settings)) || null
            } catch (error) {
                logger?.(`failed to get items: ${error}`)
                return Promise.reject(error)
            }
        },
        async annotations(
            params: AnnotationsParams,
            settings: ProviderSettings
        ): Promise<AnnotationsResult | null> {
            let match: (params: AnnotationsParams) => boolean | undefined
            try {
                logger?.('checking provider meta')
                const meta = await transport.meta({}, settings)
                logger?.(`received meta = ${JSON.stringify(meta)}`)
                match = () => false

                if (meta?.features?.annotations?.implements) {
                    match = matchSelectors(meta.features?.annotations?.selectors)
                }
            } catch (error) {
                logger?.(`failed to get provider meta: ${error}`)
                return Promise.reject(error)
            }

            const capable = match(params)
            if (!capable) {
                logger?.(
                    `skipping items for ${JSON.stringify(
                        params.uri
                    )} because it did not match the provider's selector`
                )
                return null
            }
            try {
                return (await transport.annotations?.(params, settings)) || null
            } catch (error) {
                logger?.(`failed to get annotations: ${error}`)
                return Promise.reject(error)
            }
        },
    }
}
