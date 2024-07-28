import type { AnnotationsResult, ItemsResult, MetaResult } from '@openctx/protocol'
import { LRUCache } from 'lru-cache'
import type { ProviderTransport } from './createTransport.js'

export function cachedTransport(provider: ProviderTransport): ProviderTransport {
    const cache = new LRUCache<string, MetaResult | ItemsResult | AnnotationsResult>({
        max: 20,
        ttl: 1000 * 60 * 5, // 5 minutes
    })
    function cachedMethodCall<M extends Exclude<keyof ProviderTransport, 'dispose'>>(
        method: M,
        args: Parameters<ProviderTransport[M]>,
        fn: (
            ...args: Parameters<ProviderTransport[M]>
        ) => Promise<Awaited<ReturnType<ProviderTransport[M]>>>,
    ): Promise<Awaited<ReturnType<ProviderTransport[M]>>> {
        const fullKey = `${String(method)}:${JSON.stringify(args)}`
        const entry = cache.get(fullKey) as Awaited<ReturnType<ProviderTransport[M]>> | undefined
        if (entry) {
            return Promise.resolve(entry)
        }

        return Promise.resolve(fn(...args)).then(result => {
            cache.set(fullKey, result)
            return result
        })
    }
    return {
        meta: (...args) =>
            cachedMethodCall('meta', args, (params, settings) => provider.meta(params, settings)),
        mentions: (...args) =>
            cachedMethodCall('mentions', args, (params, settings) =>
                provider.mentions(params, settings),
            ),
        items: (...args) =>
            cachedMethodCall('items', args, (params, settings) => provider.items(params, settings)),
        annotations: (...args) =>
            cachedMethodCall('annotations', args, (params, settings) =>
                provider.annotations(params, settings),
            ),
        dispose: () => {
            cache.clear()
            provider.dispose?.()
        },
    }
}
