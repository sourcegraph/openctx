import type {
    AnnotationsParams,
    ItemsParams,
    ItemsResult,
    MentionsParams,
    MentionsResult,
    MetaParams,
    MetaResult,
} from '@openctx/protocol'
import type { Provider } from '@openctx/provider'
import type { Range } from '@openctx/schema'
import { LRUCache } from 'lru-cache'
import {
    type Observable,
    type ObservableInput,
    type Unsubscribable,
    catchError,
    combineLatest,
    distinctUntilChanged,
    firstValueFrom,
    from,
    map,
    mergeMap,
    of,
    shareReplay,
} from 'rxjs'
import {
    type Annotation,
    type EachWithProviderUri,
    type ObservableProviderClient,
    type ObserveOptions,
    type ProviderClientWithSettings,
    observeAnnotations,
    observeItems,
    observeMentions,
    observeMeta,
} from '../api.js'
import {
    type ConfigurationUserInput,
    type ImportedProviderConfiguration,
    configurationFromUserInput,
} from '../configuration.js'
import type { Logger } from '../logger.js'
import { type ProviderClient, createProviderClient } from '../providerClient/createProviderClient.js'

/**
 * Hooks for the OpenCtx {@link Client} to access information about the environment, such as the
 * user's configuration and authentication info.
 *
 * @template R The type to use for ranges (such as `vscode.Range` for VS Code extensions).
 */
export interface ClientEnv<R extends Range> {
    /**
     * The configuration (set by the user in the client application) that applies to a resource,
     * typically the document in an editor that is being annotated with OpenCtx information.
     *
     * The configuration depends on the current document because some editors support per-document
     * configuration, such as VS Code: global user settings, workspace settings, workspace folder
     * settings, language-specific settings, etc.
     *
     * @param resource URI of the active resource (such as the currently open document in an
     * editor), or `undefined` if there is none.
     */
    configuration(resource?: string): ObservableInput<ConfigurationUserInput>

    /**
     * The base URI to use when resolving configured provider URIs.
     */
    providerBaseUri?: string

    /**
     * The list of providers already resolved and imported.
     */
    providers?: ImportedProviderConfiguration[]

    /**
     * The authentication info for the provider.
     *
     * @param provider The provider URI.
     */
    authInfo?(provider: string): ObservableInput<AuthInfo | null>

    /**
     * Called to print a log message.
     */
    logger?: Logger

    /**
     * Make a "rich" range from a plain range.
     *
     * @param range A plain range.
     * @returns A "rich" range (such as `vscode.Range`).
     */
    makeRange: (range: Range) => R

    /**
     * Called (if set) to dynamically import an OpenCtx provider from a URI. This can be used
     * by runtimes that need to pre-bundle providers.
     */
    importProvider?: (uri: string) => Promise<{ default: Provider }>

    /**
     * @internal
     */
    __mock__?: ClientMocks
}

/**
 * Authentication info for a provider, returned by {@link ClientEnv.authInfo}.
 */
export interface AuthInfo {
    /**
     * HTTP headers for authentication to be included on all HTTP requests to the provider.
     */
    headers?: { [name: string]: string }
}

/**
 * Options that affect the behaviour of every method on Client that calls out
 * to an underlying provider.
 */
export interface ProviderMethodOptions {
    /**
     * If providerUri is set only providers matching providerUri will be called.
     * Otherwise all providers are called and the results are aggregated.
     */
    providerUri?: string

    /**
     * If set will be called each time a provider returns an error. Errors are
     * only logged in the OpenCtx client since we do not want a badly configured
     * provider causing all to fail. This allows a caller to do have other
     * behaviours on failure.
     *
     * If errorHook is set console.error will not be called on the error.
     */
    errorHook?(providerUri: string, error: any): void
}

/**
 * An OpenCtx client, used by client applications (such as editors, code browsers, etc.) to manage
 * OpenCtx providers and items.
 *
 * @template R The type to use for ranges (such as `vscode.Range` for VS Code extensions).
 */
export interface Client<R extends Range> {
    /**
     * Get information about the configured providers, including their names and features.
     *
     * It does not continue to listen for changes, as {@link Client.metaChanges} does. Using
     * {@link Client.meta} is simpler and does not require use of observables (with a library like
     * RxJS), but it means that the client needs to manually poll for updated item kinds if
     * freshness is important.
     */
    meta(params: MetaParams, opts?: ProviderMethodOptions): Promise<EachWithProviderUri<MetaResult[]>>

    /**
     * Observe information about the configured providers.
     *
     * The returned observable streams information as it is received from the providers and
     * continues passing along any updates until unsubscribed.
     */
    metaChanges(
        params: MetaParams,
        opts?: ProviderMethodOptions
    ): Observable<EachWithProviderUri<MetaResult[]>>

    /**
     * Get the candidate items returned by the configured providers.
     *
     * It does not continue to listen for changes, as {@link Client.mentionsChanges} does. Using
     * {@link Client.Mentions} is simpler and does not require use of observables (with a library
     * like RxJS), but it means that the client needs to manually poll for updated items if
     * freshness is important.
     */
    mentions(
        params: MentionsParams,
        opts?: ProviderMethodOptions
    ): Promise<EachWithProviderUri<MentionsResult>>

    /**
     * Observe OpenCtx candidate items from the configured providers.
     *
     * The returned observable streams candidate items as they are received from the providers and
     * continues passing along any updates until unsubscribed.
     */
    mentionsChanges(
        params: MentionsParams,
        opts?: ProviderMethodOptions
    ): Observable<EachWithProviderUri<MentionsResult>>

    /**
     * Get the items returned by the configured providers.
     *
     * It does not continue to listen for changes, as {@link Client.itemsChanges} does. Using
     * {@link Client.items} is simpler and does not require use of observables (with a library like
     * RxJS), but it means that the client needs to manually poll for updated items if freshness is
     * important.
     */
    items(params: ItemsParams, opts?: ProviderMethodOptions): Promise<EachWithProviderUri<ItemsResult>>

    /**
     * Observe OpenCtx items from the configured providers.
     *
     * The returned observable streams items as they are received from the providers and continues
     * passing along any updates until unsubscribed.
     */
    itemsChanges(
        params: ItemsParams,
        opts?: ProviderMethodOptions
    ): Observable<EachWithProviderUri<ItemsResult>>

    /**
     * Get the annotations returned by the configured providers for the given resource.
     *
     * It does not continue to listen for changes, as {@link Client.annotationsChanges} does. Using
     * {@link Client.annotations} is simpler and does not require use of observables (with a library
     * like RxJS), but it means that the client needs to manually poll for updated annotations if
     * freshness is important.
     */
    annotations(
        params: AnnotationsParams,
        opts?: ProviderMethodOptions
    ): Promise<EachWithProviderUri<Annotation<R>[]>>

    /**
     * Observe OpenCtx annotations from the configured providers for the given resource.
     *
     * The returned observable streams annotations as they are received from the providers and
     * continues passing along any updates until unsubscribed.
     */
    annotationsChanges(
        params: AnnotationsParams,
        opts?: ProviderMethodOptions
    ): Observable<EachWithProviderUri<Annotation<R>[]>>

    /**
     * Dispose of the client and release all resources.
     */
    dispose(): void
}

/**
 * Create a new OpenCtx client.
 *
 * @template R The type to use for ranges (such as `vscode.Range` for VS Code extensions).
 */
export function createClient<R extends Range>(env: ClientEnv<R>): Client<R> {
    const subscriptions: Unsubscribable[] = []

    const providerCache = createProviderPool()

    // Enable/disable logger based on the `debug` config.
    const debug = from(env.configuration()).pipe(
        map(config => configurationFromUserInput(config).debug),
        distinctUntilChanged(),
        shareReplay(1)
    )
    subscriptions.push(debug.subscribe())
    const logger: Logger = message => {
        firstValueFrom(debug)
            .then(debug => {
                if (debug) {
                    env.logger?.(message)
                }
            })
            .catch(() => {})
    }

    function providerClientsWithSettings(resource?: string): Observable<ProviderClientWithSettings[]> {
        return from(env.configuration(resource))
            .pipe(
                map(config => {
                    if (!config.enable) {
                        config = { ...config, providers: {} }
                    }
                    return configurationFromUserInput(config, env.providers)
                })
            )
            .pipe(
                mergeMap(configuration =>
                    configuration.providers.length > 0
                        ? combineLatest(
                              configuration.providers.map(({ providerUri, settings }) =>
                                  (env.authInfo ? from(env.authInfo(providerUri)) : of(null)).pipe(
                                      map(authInfo => ({
                                          uri: providerUri,
                                          providerClient: env.__mock__?.getProviderClient
                                              ? env.__mock__.getProviderClient()
                                              : providerCache.getOrCreate(
                                                      { providerUri, authInfo: authInfo ?? undefined },
                                                      {
                                                          providerBaseUri: env.providerBaseUri,
                                                          logger,
                                                          importProvider: env.importProvider,
                                                      },
                                                      env.providers?.find(
                                                          provider =>
                                                              provider.providerUri === providerUri
                                                      )?.provider
                                                  ),
                                          settings,
                                      })),
                                      catchError(error => {
                                          logger(
                                              `Error creating provider client for ${providerUri}: ${error}`
                                          )
                                          return of(null)
                                      })
                                  )
                              )
                          )
                        : of([])
                ),

                // Filter out null clients.
                map(providerClients =>
                    providerClients.filter(
                        (providerClient): providerClient is ProviderClientWithSettings =>
                            providerClient !== null
                    )
                )
            )
    }

    const filterProviders = (
        providersObservable: Observable<ProviderClientWithSettings[]>,
        opts: Pick<ProviderMethodOptions, 'providerUri'>
    ): Observable<ProviderClientWithSettings[]> => {
        const uri = opts.providerUri
        if (!uri) {
            return providersObservable
        }

        return providersObservable.pipe(
            map(providers => providers.filter(provider => provider.uri === uri))
        )
    }

    type ChangesOpts = ProviderMethodOptions & ObserveOptions

    const metaChanges = (
        params: MetaParams,
        opts: ChangesOpts
    ): Observable<EachWithProviderUri<MetaResult[]>> => {
        return observeMeta(filterProviders(providerClientsWithSettings(undefined), opts), params, {
            ...opts,
            logger: env.logger,
        })
    }

    const mentionsChanges = (
        params: MentionsParams,
        opts: ChangesOpts
    ): Observable<EachWithProviderUri<MentionsResult>> => {
        return observeMentions(filterProviders(providerClientsWithSettings(undefined), opts), params, {
            ...opts,
            logger: env.logger,
        })
    }

    const itemsChanges = (
        params: ItemsParams,
        opts: ChangesOpts
    ): Observable<EachWithProviderUri<ItemsResult>> => {
        return observeItems(filterProviders(providerClientsWithSettings(undefined), opts), params, {
            ...opts,
            logger: env.logger,
        })
    }

    const annotationsChanges = (
        params: AnnotationsParams,
        opts: ChangesOpts
    ): Observable<EachWithProviderUri<Annotation<R>[]>> => {
        return observeAnnotations(
            filterProviders(providerClientsWithSettings(params.uri), opts),
            params,
            {
                ...opts,
                logger: env.logger,
                makeRange: env.makeRange,
            }
        )
    }

    return {
        meta: (params, opts) =>
            firstValueFrom(metaChanges(params, { ...opts, emitPartial: false }), {
                defaultValue: [],
            }),
        metaChanges: (params, opts) => metaChanges(params, { ...opts, emitPartial: true }),
        mentions: (params, opts) =>
            firstValueFrom(mentionsChanges(params, { ...opts, emitPartial: false }), {
                defaultValue: [],
            }),
        mentionsChanges: (params, opts) => mentionsChanges(params, { ...opts, emitPartial: true }),
        items: (params, opts) =>
            firstValueFrom(itemsChanges(params, { ...opts, emitPartial: false }), {
                defaultValue: [],
            }),
        itemsChanges: (params, opts) => itemsChanges(params, { ...opts, emitPartial: true }),
        annotations: (params, opts) =>
            firstValueFrom(annotationsChanges(params, { ...opts, emitPartial: false }), {
                defaultValue: [],
            }),
        annotationsChanges: (params, opts) => annotationsChanges(params, { ...opts, emitPartial: true }),
        dispose() {
            for (const sub of subscriptions) {
                sub.unsubscribe()
            }
        },
    }
}

interface ProviderCacheKey {
    providerUri: string
    authInfo: AuthInfo | undefined
}

function createProviderPool(): {
    getOrCreate: (
        key: ProviderCacheKey,
        env: Pick<ClientEnv<any>, 'providerBaseUri' | 'logger' | 'importProvider'>,
        provider?: Provider
    ) => ProviderClient
} {
    function cacheKey(key: ProviderCacheKey): string {
        return JSON.stringify(key)
    }

    const cache = new LRUCache<string, ProviderClient>({
        ttl: 1000 * 60 * 5 /* 5 minutes */,
        ttlResolution: 1000,
        ttlAutopurge: true,
    })

    return {
        getOrCreate(key, env, provider) {
            const existing = cache.get(cacheKey(key))
            if (existing) {
                return existing
            }

            const c = createProviderClient(
                key.providerUri,
                {
                    providerBaseUri: env.providerBaseUri,
                    authInfo: key.authInfo,
                    logger: env.logger,
                    importProvider: env.importProvider,
                },
                provider
            )
            cache.set(cacheKey(key), c)
            return c
        },
    }
}

/**
 * For use in tests only.
 *
 * @internal
 */
interface ClientMocks {
    getProviderClient: () => Partial<ObservableProviderClient>
}
