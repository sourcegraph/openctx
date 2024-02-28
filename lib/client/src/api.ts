import type {
    AnnotationsParams,
    AnnotationsResult,
    ItemsParams,
    ItemsResult,
    ProviderSettings,
} from '@openctx/protocol'
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
        ...args: Parameters<ProviderClient[M]>
    ) => ObservableInput<Awaited<ReturnType<ProviderClient[M]>>>
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

/**
 * Observes OpenCtx items from the configured providers.
 *
 * TODO(sqs): dedupe with observeAnnotations
 */
export function observeItems(
    providerClients: Observable<ProviderClientWithSettings[]>,
    params: ItemsParams,
    { emitPartial, logger }: Pick<ClientEnv<never>, 'logger'> & ObserveOptions
): Observable<Item[]> {
    return providerClients.pipe(
        mergeMap(providerClients =>
            providerClients && providerClients.length > 0
                ? combineLatest(
                      providerClients.map(({ providerClient, settings }) =>
                          defer(() => from(providerClient.items(params, settings))).pipe(
                              emitPartial ? startWith(null) : tap(),
                              catchError(error => {
                                  logger?.(`failed to get items: ${error}`)
                                  console.error(error)
                                  return of(null)
                              })
                          )
                      )
                  )
                : of([])
        ),
        map(result => result.filter((v): v is ItemsResult => v !== null).flat()),
        tap(items => {
            if (LOG_VERBOSE) {
                logger?.(`got ${items.length} items: ${JSON.stringify(items)}`)
            }
        })
    )
}

/**
 * Observes OpenCtx annotations from the configured providers.
 */
export function observeAnnotations<R extends Range>(
    providerClients: Observable<ProviderClientWithSettings[]>,
    params: AnnotationsParams,
    { emitPartial, logger, makeRange }: Pick<ClientEnv<R>, 'logger' | 'makeRange'> & ObserveOptions
): Observable<Annotation<R>[]> {
    return providerClients.pipe(
        mergeMap(providerClients =>
            providerClients && providerClients.length > 0
                ? combineLatest(
                      providerClients.map(({ providerClient, settings }) =>
                          defer(() => from(providerClient.annotations(params, settings))).pipe(
                              emitPartial ? startWith(null) : tap(),
                              catchError(error => {
                                  logger?.(`failed to get annotations: ${error}`)
                                  console.error(error)
                                  return of(null)
                              })
                          )
                      )
                  )
                : of([])
        ),
        map(result => result.filter((v): v is AnnotationsResult => v !== null).flat()),
        map(anns =>
            anns
                .map(ann => ({ ...ann, range: ann.range ? makeRange(ann.range) : undefined }))
                .sort((a, b) => {
                    const lineCmp = (a.range?.start.line ?? 0) - (b.range?.start.line ?? 0)
                    if (lineCmp !== 0) {
                        return lineCmp
                    }
                    return (a.range?.start.character ?? 0) - (b.range?.start.character ?? 0)
                })
        ),
        tap(anns => {
            if (LOG_VERBOSE) {
                logger?.(`got ${anns.length} annotations: ${JSON.stringify(anns)}`)
            }
        })
    )
}

const LOG_VERBOSE = true
