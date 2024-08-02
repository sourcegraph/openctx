import type {
    AnnotationsParams,
    ItemsParams,
    ItemsResult,
    MentionsParams,
    MentionsResult,
    MetaParams,
    MetaResult,
    ProviderSettings,
} from '@openctx/protocol'
import type { Annotation as AnnotationWithPlainRange, Range } from '@openctx/schema'
import {
    type Observable,
    type ObservableInput,
    catchError,
    combineLatest,
    defer,
    distinctUntilChanged,
    filter,
    from,
    map,
    mergeMap,
    of,
    startWith,
    tap,
} from 'rxjs'
import type { ClientEnv, ProviderMethodOptions } from './client/client.js'
import type { ProviderClient } from './providerClient/createProviderClient.js'

/**
 * An OpenCtx annotation.
 */
export interface Annotation<R extends Range = Range> extends Omit<AnnotationWithPlainRange, 'range'> {
    range?: R | undefined
}

/**
 * Like {@link ProviderClient}, but the provider methods return {@link Observable} values instead of
 * just {@link Promise} values. This makes it easier to test {@link observeItems}.
 */
export type ObservableProviderClient = {
    [M in keyof ProviderClient]: (
        ...args: Parameters<Required<ProviderClient>[M]>
    ) => ObservableInput<Awaited<ReturnType<Required<ProviderClient>[M]>>>
}

export interface ProviderClientWithSettings {
    uri: string
    providerClient: ObservableProviderClient | ProviderClient
    settings: ProviderSettings
}

export interface ObserveOptions extends Pick<ProviderMethodOptions, 'errorHook'> {
    /**
     * Emit partial results immediately. If `false`, wait for all providers to return an initial
     * result before emitting. If the caller is consuming the result as a Promise (with only one
     * value), this should be `false`.
     */
    emitPartial: boolean
}

/**
 * This type is used internally by the OpenCtx client to assign a provider URI to each item.
 */
export type EachWithProviderUri<T extends unknown[]> = ((T extends readonly (infer ElementType)[]
    ? ElementType
    : never) & {
    providerUri: string
})[]

function observeProviderCall<R>(
    providerClients: Observable<ProviderClientWithSettings[]>,
    fn: (provider: ProviderClientWithSettings) => Observable<R[] | null>,
    { emitPartial, errorHook, logger }: Pick<ClientEnv<never>, 'logger'> & ObserveOptions,
): Observable<EachWithProviderUri<R[]>> {
    // This sentinel value lets us avoid emitting a "fake" partial result when `emitPartial` is
    // true. We use `combineLatest` below, which waits until all providers have emitted until it
    // emits a value, so we need to use `startWith(null)`. But this means that upon subscription, we
    // get a meaningless `[null, null, null, ...]` value. Using this sentinel value instead of
    // `null` lets us detect that case and filter it out so our caller doesn't see it. But in the
    // case where there are no providers, we still want to emit [] because that is a true result.
    const EMIT_PARTIAL_SENTINEL: 'emit-partial-sentinel' = {} as any

    return providerClients.pipe(
        mergeMap(providerClients =>
            providerClients && providerClients.length > 0
                ? combineLatest(
                      providerClients.map(({ uri, providerClient, settings }) =>
                          defer(() => fn({ uri, providerClient, settings }))
                              .pipe(
                                  emitPartial ? startWith(EMIT_PARTIAL_SENTINEL) : tap(),
                                  catchError(error => {
                                      if (errorHook) {
                                          errorHook(uri, error)
                                      } else {
                                          logger?.(`failed to call provider: ${error}`)
                                          console.error(error)
                                      }
                                      return of(null)
                                  }),
                              )
                              .pipe(
                                  map(items =>
                                      items === EMIT_PARTIAL_SENTINEL
                                          ? items
                                          : (items || []).map(item => ({ ...item, providerUri: uri })),
                                  ),
                              ),
                      ),
                  )
                : of([]),
        ),
        filter(
            result =>
                !emitPartial || result.length === 0 || result.some(v => v !== EMIT_PARTIAL_SENTINEL),
        ),
        map(result =>
            result
                .filter((v): v is EachWithProviderUri<R[]> => v !== null && v !== EMIT_PARTIAL_SENTINEL)
                .flat(),
        ),
        distinctUntilChanged((a, b) => JSON.stringify(a) === JSON.stringify(b)),
        tap(items => {
            if (LOG_VERBOSE) {
                logger?.(`got ${items.length} results: ${JSON.stringify(items)}`)
            }
        }),
    )
}

/**
 * Observes OpenCtx items kinds from the configured providers.
 */
export function observeMeta(
    providerClients: Observable<ProviderClientWithSettings[]>,
    params: MetaParams,
    opts: Pick<ClientEnv<never>, 'logger'> & ObserveOptions,
): Observable<EachWithProviderUri<MetaResult[]>> {
    return observeProviderCall<MetaResult>(
        providerClients,
        ({ providerClient, settings }) =>
            from(providerClient.meta(params, settings)).pipe(map(result => [result])),
        opts,
    )
}

/**
 * Observes OpenCtx candidate items from the configured providers.
 */
export function observeMentions(
    providerClients: Observable<ProviderClientWithSettings[]>,
    params: MentionsParams,
    opts: Pick<ClientEnv<never>, 'logger'> & ObserveOptions,
): Observable<EachWithProviderUri<MentionsResult>> {
    return observeProviderCall(
        providerClients,
        ({ providerClient, settings }) => from(providerClient.mentions(params, settings)),
        opts,
    )
}

/**
 * Observes OpenCtx items from the configured providers.
 */
export function observeItems(
    providerClients: Observable<ProviderClientWithSettings[]>,
    params: ItemsParams,
    opts: Pick<ClientEnv<never>, 'logger'> & ObserveOptions,
): Observable<EachWithProviderUri<ItemsResult>> {
    return observeProviderCall(
        providerClients,
        ({ providerClient, settings }) => from(providerClient.items(params, settings)),
        opts,
    )
}

/**
 * Observes OpenCtx annotations from the configured providers.
 */
export function observeAnnotations<R extends Range>(
    providerClients: Observable<ProviderClientWithSettings[]>,
    params: AnnotationsParams,
    {
        logger,
        makeRange,
        emitPartial,
        errorHook,
    }: Pick<ClientEnv<R>, 'logger' | 'makeRange'> & ObserveOptions,
): Observable<EachWithProviderUri<Annotation<R>[]>> {
    return observeProviderCall(
        providerClients,
        ({ providerClient, settings }) =>
            from(providerClient.annotations(params, settings)).pipe(
                map(anns =>
                    anns
                        ? anns
                              .map(ann => ({
                                  ...ann,
                                  range: ann.range ? makeRange(ann.range) : undefined,
                              }))
                              .sort((a, b) => {
                                  const lineCmp = (a.range?.start.line ?? 0) - (b.range?.start.line ?? 0)
                                  if (lineCmp !== 0) {
                                      return lineCmp
                                  }
                                  return (
                                      (a.range?.start.character ?? 0) - (b.range?.start.character ?? 0)
                                  )
                              })
                        : null,
                ),
            ),
        { logger, emitPartial, errorHook },
    )
}

const LOG_VERBOSE = false
