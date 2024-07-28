import type { Provider } from '@openctx/provider'
import type { AuthInfo, ClientEnv } from '../../client/client.js'
import type { Logger } from '../../logger.js'
import { cachedTransport } from './cache.js'
import { createHttpTransport } from './http.js'
import { createModuleTransport } from './module.js'

/**
 * A provider transport is a low-level TypeScript wrapper around the provider protocol. It is a
 * internal implementation detail; clients should not use it directly.
 *
 * @internal
 */
export type ProviderTransport = {
    // Make the Provider methods all async (i.e., so they return only `Promise<T>` not `T |
    // Promise<T>`).
    [K in Exclude<keyof Provider, 'dispose'>]: (
        ...args: Parameters<NonNullable<Provider[K]>>
    ) => Promise<Awaited<ReturnType<NonNullable<Provider[K]>>>>
} & { dispose?(): void }

export interface ProviderTransportOptions
    extends Pick<ClientEnv<any>, 'providerBaseUri' | 'importProvider'> {
    authInfo?: AuthInfo
    cache?: boolean
    logger?: Logger
}

/**
 * Create a transport that communicates with a provider using the provider API.
 *
 * @internal
 */
export function createTransport(
    providerUri: string,
    options: ProviderTransportOptions,
): ProviderTransport {
    function doResolveProvider(providerUri: string): ProviderTransport {
        let url = new URL(providerUri, options.providerBaseUri)

        if (isHttpOrHttps(url) && !isRemoteJavaScriptFile(url)) {
            // Provider is an HTTP endpoint.
            return createHttpTransport(providerUri, options)
        }

        // Provider is a JavaScript module.
        if (isHttpsPlusJs(url)) {
            url = removePlusJs(url)
        }
        return createModuleTransport(url.toString(), options)
    }

    let provider = doResolveProvider(providerUri)
    if (options.cache) {
        provider = cachedTransport(provider)
    }
    return provider
}

function isRemoteJavaScriptFile(url: URL): boolean {
    return (
        (isHttpOrHttps(url) && hasJavaScriptExt(url.pathname)) ||
        isHttpsPlusJs(url) ||
        isWellKnownNpmUrl(url)
    )
}

function isHttpOrHttps(url: URL): boolean {
    return url.protocol === 'http:' || url.protocol === 'https:'
}

function hasJavaScriptExt(path: string): boolean {
    return /\.[cm]?[jt]s$/.test(path)
}

function isHttpsPlusJs(url: URL): boolean {
    return url.protocol === 'http+js:' || url.protocol === 'https+js:'
}

function removePlusJs(url: URL): URL {
    return new URL(url.toString().replace(/^(https?)\+js:/, '$1:'))
}

/**
 * Matches the https://openctx.org/npm/* service.
 */
function isWellKnownNpmUrl(url: URL): boolean {
    return url.protocol === 'https:' && url.host === 'openctx.org' && url.pathname.startsWith('/npm/')
}
