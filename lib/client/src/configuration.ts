import type { ProviderSettings } from '@openctx/protocol'
import type { Provider } from '@openctx/provider'

/**
 * Raw configuration set by the user in the client application. Use
 * {@link configurationFromUserInput} to normalize this raw input.
 */
export interface ConfigurationUserInput {
    enable?: boolean
    debug?: boolean

    /**
     * The OpenCtx providers to use.
     */
    providers?: { [providerUri: string]: boolean | ProviderSettings }
}

/**
 * The normalized form of the raw {@link ConfigurationUserInput}, with defaults and other
 * normalization applied.
 */
export interface Configuration extends Omit<Required<ConfigurationUserInput>, 'providers'> {
    providers: { providerUri: string; settings: ProviderSettings }[]
}

export interface ImportedProviderConfiguration {
    providerUri: string
    settings: boolean | ProviderSettings
    provider: Provider
}
/**
 * Apply defaults to and normalize the raw {@link ConfigurationUserInput}.
 */
export function configurationFromUserInput(
    raw: ConfigurationUserInput,
    providers: ImportedProviderConfiguration[] = []
): Configuration {
    return {
        enable: raw.enable ?? true,
        debug: raw.debug ?? false,
        providers: [
            ...providersFromUserInput(raw.providers),
            ...providers.map(({ providerUri, settings }) => ({
                providerUri,
                settings: typeof settings === 'boolean' ? {} : settings,
            })),
        ],
    }
}

function providersFromUserInput(
    providers: ConfigurationUserInput['providers']
): Configuration['providers'] {
    return Object.entries(providers ?? [])
        .map(([providerUri, settings]) =>
            settings ? { providerUri, settings: settings === true ? {} : settings } : null
        )
        .filter((v): v is Configuration['providers'][number] => v !== null)
        .sort((a, b) => a.providerUri.localeCompare(b.providerUri))
}
