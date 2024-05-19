import type { Provider } from '@openctx/provider'
import type { ProviderTransport, ProviderTransportOptions } from './createTransport.js'

export function createModuleTransport(
    providerUri: string,
    { importProvider }: Pick<ProviderTransportOptions, 'importProvider'>
): ProviderTransport {
    return lazyProvider(
        (importProvider ? importProvider(providerUri) : import(/* @vite-ignore */ providerUri)).then(
            mod => providerFromModule(mod)
        )
    )
}

export async function fetchProviderSource(providerUri: string): Promise<string> {
    const resp = await fetch(providerUri)

    if (!resp.ok) {
        throw new Error(
            `OpenCtx remote provider module URL ${providerUri} responded with HTTP error ${resp.status} ${resp.statusText}`
        )
    }
    const contentType = resp.headers.get('Content-Type')?.trim()?.replace(/;.*$/, '')
    if (
        !contentType ||
        (contentType !== 'text/javascript' &&
            contentType !== 'application/javascript' &&
            contentType !== 'text/plain')
    ) {
        throw new Error(
            `OpenCtx remote provider module URL ${providerUri} reported invalid Content-Type ${JSON.stringify(
                contentType
            )} (expected "text/javascript" or "text/plain")`
        )
    }

    const moduleSource = await resp.text()
    return moduleSource
}

interface ProviderModule {
    // It is easy for module authors to misconfigure their bundler and emit a doubly nested
    // `default` export, so we handle that case gracefully.
    default: Provider | { default: Provider }
}

function providerFromModule(providerModule: ProviderModule): Provider {
    let impl = providerModule.default
    if ('default' in impl) {
        impl = impl.default
    }
    return impl
}

function lazyProvider(provider: Promise<Provider>): ProviderTransport {
    return {
        meta: async (params, settings) => (await provider).meta(params, settings),
        mentions: async (params, settings) => (await provider).mentions?.(params, settings) ?? [],
        items: async (params, settings) => (await provider).items?.(params, settings) ?? [],
        annotations: async (params, settings) => (await provider).annotations?.(params, settings) ?? [],
        dispose: () => {
            provider.then(provider => provider.dispose?.()).catch(error => console.error(error))
        },
    }
}
