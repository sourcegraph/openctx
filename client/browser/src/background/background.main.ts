import '../shared/polyfills'
// ^^ import polyfills first

import { createClient } from '@openctx/client'
import type { UnsubscribableLike } from '@openctx/client/observable'
import type { Provider } from '@openctx/provider'
import helloWorldProvider from '@openctx/provider-hello-world'
import linksProvider from '@openctx/provider-links'
import prometheusProvider from '@openctx/provider-prometheus'
import storybookProvider from '@openctx/provider-storybook'
import { unsubscribe } from 'observable-fns'
import { addMessageListenersForBackgroundApi } from '../browser-extension/web-extension-api/rpc.js'
import { configurationChanges } from '../configuration.js'

const BUILTIN_PROVIDER_MODULES: Record<string, Provider<any>> = {
    'https://openctx.org/npm/@openctx/provider-hello-world': helloWorldProvider,
    'https://openctx.org/npm/@openctx/provider-links': linksProvider,
    'https://openctx.org/npm/@openctx/provider-storybook': storybookProvider,
    'https://openctx.org/npm/@openctx/provider-prometheus': prometheusProvider,
}

function getBuiltinProvider(uri: string): Provider {
    const mod = BUILTIN_PROVIDER_MODULES[uri]
    if (!mod) {
        throw new Error(
            `Only HTTP endpoint providers and the following built-in providers are supported: ${Object.keys(
                BUILTIN_PROVIDER_MODULES,
            ).join(', ')}. See https://openctx.org/docs/clients/browser-extension#known-issues.`,
        )
    }
    return mod
}

function main(): void {
    const subscriptions: UnsubscribableLike[] = []

    const client = createClient({
        configuration: () => configurationChanges,
        logger: console.error,
        makeRange: r => r,
        importProvider: uri => Promise.resolve({ default: getBuiltinProvider(uri) }),
    })
    subscriptions.push(() => client.dispose())

    subscriptions.push(
        ...addMessageListenersForBackgroundApi({
            annotationsChanges: (...args) => client.annotationsChanges(...args),
        }),
    )

    self.addEventListener(
        'unload',
        () => {
            for (const s of subscriptions) {
                if (s) {
                    unsubscribe(s)
                }
            }
        },
        { once: true },
    )
}

// Browsers log an unhandled Promise here automatically with a nice stack trace, so we don't need to
// `.catch(...)` it.
main()
