import { type AnnotationsParams, type AnnotationsResult, type ProviderSettings } from '@opencodegraph/protocol'
import { scopedLogger } from '../logger'
import { matchSelectors } from './selector'
import { createTransport, type ProviderTransportOptions } from './transport/createTransport'

/**
 * A {@link ProviderClient} communicates with a single OpenCodeGraph provider. It is stateless and
 * wraps a {@link ProviderTransport}.
 */
export interface ProviderClient {
    /**
     * Get annotations from the provider, respecting the provider's capabilities. For example, if
     * the document is not matched by the provider's selectors, then no annotations will be
     * returned.
     */
    annotations(params: AnnotationsParams, settings: ProviderSettings): Promise<AnnotationsResult | null>
}

export interface ProviderClientOptions
    extends Pick<
        ProviderTransportOptions,
        'authInfo' | 'logger' | 'dynamicImportFromUri' | 'dynamicImportFromSource'
    > {}

/**
 * Create a new {@link ProviderClient}.
 */
export function createProviderClient(
    providerUri: string,
    { logger, ...options }: ProviderClientOptions = {}
): ProviderClient {
    logger = scopedLogger(logger, `providerClient(${providerUri})`)

    const transport = createTransport(providerUri, { ...options, cache: true, logger })

    return {
        async annotations(params: AnnotationsParams, settings: ProviderSettings): Promise<AnnotationsResult | null> {
            let match: (params: AnnotationsParams) => boolean | undefined
            try {
                logger?.('checking provider capabilities')
                const capabilities = await transport.capabilities({}, settings)
                logger?.(`received capabilities = ${JSON.stringify(capabilities)}`)
                match = matchSelectors(capabilities.selector)
            } catch (error) {
                logger?.(`failed to get provider capabilities: ${error}`)
                return Promise.reject(error)
            }

            const capable = match(params)
            if (!capable) {
                logger?.(
                    `skipping annotations for ${JSON.stringify(
                        params.file
                    )} because it did not match the provider's selector`
                )
                return null
            }
            try {
                const result = await transport.annotations(params, settings)
                return addProviderIdPrefix(providerUri, result)
            } catch (error) {
                logger?.(`failed to get annotations: ${error}`)
                return Promise.reject(error)
            }
        },
    }
}

/**
 * Namespace item IDs so that they do not collide across providers.
 */
function addProviderIdPrefix(providerUri: string, result: AnnotationsResult): AnnotationsResult {
    return {
        items: result.items.map(item => ({ ...item, id: `${providerUri}/${item.id}` })),
        annotations: result.annotations.map(annotation => ({
            ...annotation,
            item: { id: `${providerUri}/${annotation.item.id}` },
        })),
    }
}
