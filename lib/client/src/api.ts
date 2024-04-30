import type { AnnotationsParams, ItemsParams, ProviderSettings } from '@openctx/protocol'
import type { Annotation as AnnotationWithPlainRange, Item, Range } from '@openctx/schema'
import {
    type Observable,
    type ObservableInput,
    catchError,
    combineLatest,
    defer,
    from,
    map,
    mergeMap,
    of,
    startWith,
    tap,
} from 'rxjs'
import type { ClientEnv } from './client/client'
import type { ProviderClient } from './providerClient/createProviderClient'

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
    providerClient: ObservableProviderClient | ProviderClient
    settings: ProviderSettings
}

export interface ObserveOptions {
    /**
     * Emit partial results immediately. If `false`, wait for all providers to return an initial
     * result before emitting. If the caller is consuming the result as a Promise (with only one
     * value), this should be `false`.
     */
    emitPartial: boolean
}

function observeProviderCall<R>(
    providerClients: Observable<ProviderClientWithSettings[]>,
    fn: (provider: ProviderClientWithSettings) => Observable<R[] | null>,
    { emitPartial, logger }: Pick<ClientEnv<never>, 'logger'> & ObserveOptions
): Observable<R[]> {
    return providerClients.pipe(
        mergeMap(providerClients =>
            providerClients && providerClients.length > 0
                ? combineLatest(
                      providerClients.map(({ providerClient, settings }) =>
                          defer(() => fn({ providerClient, settings })).pipe(
                              emitPartial ? startWith(null) : tap(),
                              catchError(error => {
                                  logger?.(`failed to call provider: ${error}`)
                                  console.error(error)
                                  return of(null)
                              })
                          )
                      )
                  )
                : of([])
        ),
        map(result => result.filter((v): v is R[] => v !== null).flat()),
        tap(items => {
            if (LOG_VERBOSE) {
                logger?.(`got ${items.length} results: ${JSON.stringify(items)}`)
            }
        })
    )
}

/**
 * Observes OpenCtx items from the configured providers.
 */
export function observeItems(
    providerClients: Observable<ProviderClientWithSettings[]>,
    params: ItemsParams,
    { logger, emitPartial }: Pick<ClientEnv<never>, 'logger'> & ObserveOptions
): Observable<Item[]> {
    return observeProviderCall(
        providerClients,
        ({ providerClient, settings }) => from(providerClient.items(params, settings)),
        { logger, emitPartial }
    )
}

/**
 * Observes OpenCtx annotations from the configured providers.
 */
export function observeAnnotations<R extends Range>(
    providerClients: Observable<ProviderClientWithSettings[]>,
    params: AnnotationsParams,
    { logger, makeRange, emitPartial }: Pick<ClientEnv<R>, 'logger' | 'makeRange'> & ObserveOptions
): Observable<Annotation<R>[]> {
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
                        : null
                )
            ),
        { logger, emitPartial }
    )
}

const LOG_VERBOSE = false
