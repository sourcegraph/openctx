import type { AnnotationsParams, ItemsParams } from '@openctx/protocol'
import type { Item, Range } from '@openctx/schema'
import { Observable } from 'observable-fns'
import { describe, expect, test } from 'vitest'
import {
    type Annotation,
    type EachWithProviderUri,
    type ProviderClientWithSettings,
    observeAnnotations,
    observeItems,
} from './api.js'
import { allValuesFrom, observableOfTimedSequence, readValuesFrom } from './misc/observable.js'
import type { ProviderClient } from './providerClient/createProviderClient.js'

const FIXTURE_ITEMS_PARAMS: ItemsParams = {}

const FIXTURE_ANNOTATIONS_PARAMS: AnnotationsParams = {
    uri: 'file:///f',
    content: 'A',
}

function fixtureItemWithoutProviderUri(label: string): Item {
    return { title: label.toUpperCase() }
}

function fixtureItem(label: string, providerUri: string): Item & { providerUri: string } {
    return { ...fixtureItemWithoutProviderUri(label), providerUri }
}

function fixtureAnn(label: string, providerUri: string): EachWithProviderUri<Annotation[]>[0] {
    return {
        providerUri,
        uri: FIXTURE_ANNOTATIONS_PARAMS.uri,
        range: { start: { line: 0, character: 0 }, end: { line: 0, character: 1 } },
        item: fixtureItemWithoutProviderUri(label),
    }
}

const DUMMY_CLIENT: ProviderClient = {
    annotations() {
        throw new Error('noop')
    },
    items() {
        throw new Error('noop')
    },
    mentions() {
        throw new Error('noop')
    },
    meta() {
        throw new Error('noop')
    },
}

describe('observeItems', () => {
    const OPTS: Parameters<typeof observeItems>[2] = {
        emitPartial: false,
        errorHook: (providerUri, err) => {
            throw new Error('unexpected error from ' + providerUri + ' ' + err)
        },
    }

    test('simple', async () => {
        const { values, done } = readValuesFrom(
            observeItems(
                Observable.of([
                    {
                        uri: 'a',
                        providerClient: {
                            ...DUMMY_CLIENT,
                            items: () => Promise.resolve([fixtureItem('a', 'a')]),
                        },
                        settings: {},
                    },
                ]),
                FIXTURE_ITEMS_PARAMS,
                OPTS,
            ),
        )

        await done
        expect(values).toStrictEqual<typeof values>([[fixtureItem('a', 'a')]])
    })

    test('no providers', async () => {
        const { values, done } = readValuesFrom(
            observeItems(Observable.of([]), FIXTURE_ITEMS_PARAMS, OPTS),
        )

        await done
        expect(values).toStrictEqual<typeof values>([[]])
    })

    test('2 providers', async () => {
        const { values, done } = readValuesFrom(
            observeItems(
                Observable.of([
                    {
                        uri: 'a',
                        providerClient: {
                            ...DUMMY_CLIENT,
                            items: () => Promise.resolve([fixtureItem('a', 'a')]),
                        },
                        settings: {},
                    },
                    {
                        uri: 'b',
                        providerClient: {
                            ...DUMMY_CLIENT,
                            items: () => Promise.resolve([fixtureItem('b', 'b')]),
                        },
                        settings: {},
                    },
                ]),
                FIXTURE_ITEMS_PARAMS,
                OPTS,
            ),
        )

        await done
        expect(values).toStrictEqual<typeof values>([[fixtureItem('a', 'a'), fixtureItem('b', 'b')]])
    })

    test('provider error', async () => {
        let errorHookCalled = 0
        const optsExpectingError = {
            ...OPTS,
            errorHook: (providerUri: string, err: any) => {
                errorHookCalled++
                expect(providerUri).toBe('a')
                expect(err.message).toBe('erroringProvider')
            },
        }
        const erroringProvider: ProviderClientWithSettings = {
            uri: 'a',
            providerClient: {
                ...DUMMY_CLIENT,
                items: () => {
                    throw new Error('erroringProvider')
                },
            },
            settings: {},
        }

        const values = await allValuesFrom(
            observeItems(
                observableOfTimedSequence<ProviderClientWithSettings[]>(
                    0,
                    [
                        erroringProvider,
                        {
                            uri: 'a',
                            providerClient: {
                                ...DUMMY_CLIENT,
                                items: () => Promise.resolve([fixtureItem('b', 'a')]),
                            },
                            settings: {},
                        },
                    ],
                    0,

                    [erroringProvider],
                    0,

                    [
                        {
                            uri: 'c',
                            providerClient: {
                                ...DUMMY_CLIENT,
                                items: () => Promise.resolve([fixtureItem('b', 'c')]),
                            },
                            settings: {},
                        },
                    ],
                ),

                FIXTURE_ITEMS_PARAMS,
                optsExpectingError,
            ),
        )
        expect(values).toStrictEqual<typeof values>([
            [fixtureItem('b', 'a')],
            [],
            [fixtureItem('b', 'c')],
        ])
        expect(errorHookCalled).toBe(2) // TODO(sqs): was 1 in RxJS
    })

    test('config changes', async () => {
        const values = await allValuesFrom(
            observeItems(
                observableOfTimedSequence<ProviderClientWithSettings[]>(
                    0,
                    [
                        {
                            uri: 'a',
                            providerClient: {
                                ...DUMMY_CLIENT,
                                items: () => Promise.resolve([fixtureItem('a', 'a')]),
                            },
                            settings: {},
                        },
                    ],
                    0,

                    [
                        {
                            uri: 'a',
                            providerClient: {
                                ...DUMMY_CLIENT,
                                items: () => Promise.resolve([fixtureItem('a', 'a')]),
                            },
                            settings: {},
                        },
                        {
                            uri: 'b',
                            providerClient: {
                                ...DUMMY_CLIENT,
                                items: () => Promise.resolve([fixtureItem('b', 'b')]),
                            },
                            settings: {},
                        },
                    ],
                ),
                FIXTURE_ITEMS_PARAMS,
                OPTS,
            ),
        )

        expect(values).toStrictEqual<typeof values>([
            [fixtureItem('a', 'a')],
            [fixtureItem('a', 'a'), fixtureItem('b', 'b')],
        ])
    })
})

describe('observeAnnotations', () => {
    const OPTS: Parameters<typeof observeAnnotations>[2] = { makeRange: r => r, emitPartial: false }

    test('simple', async () => {
        const values = await allValuesFrom(
            observeAnnotations<Range>(
                Observable.of([
                    {
                        uri: 'a',
                        providerClient: {
                            ...DUMMY_CLIENT,
                            annotations: () => Promise.resolve([fixtureAnn('a', 'a')]),
                        },
                        settings: {},
                    },
                ]),
                FIXTURE_ANNOTATIONS_PARAMS,
                OPTS,
            ),
        )
        expect(values).toStrictEqual<typeof values>([[fixtureAnn('a', 'a')]])
    })

    test('no providers', async () => {
        const values = await allValuesFrom(
            observeAnnotations<Range>(Observable.of([]), FIXTURE_ANNOTATIONS_PARAMS, OPTS),
        )
        expect(values).toStrictEqual<typeof values>([[]])
    })

    test('2 providers', async () => {
        const values = await allValuesFrom(
            observeAnnotations<Range>(
                Observable.of([
                    {
                        uri: 'a',
                        providerClient: {
                            ...DUMMY_CLIENT,
                            annotations: () => Promise.resolve([fixtureAnn('a', 'a')]),
                        },
                        settings: {},
                    },
                    {
                        uri: 'b',
                        providerClient: {
                            ...DUMMY_CLIENT,
                            annotations: () => Promise.resolve([fixtureAnn('b', 'b')]),
                        },
                        settings: {},
                    },
                ]),
                FIXTURE_ANNOTATIONS_PARAMS,
                OPTS,
            ),
        )
        expect(values).toStrictEqual<typeof values>([[fixtureAnn('a', 'a'), fixtureAnn('b', 'b')]])
    })

    test('provider error', async () => {
        let errorHookCalled = 0
        const optsExpectingError = {
            ...OPTS,
            errorHook: (providerUri: string, err: any) => {
                errorHookCalled++
                expect(providerUri).toBe('a')
                expect(err.message).toBe('erroringProvider')
            },
        }
        const erroringProvider: ProviderClientWithSettings = {
            uri: 'a',
            providerClient: {
                ...DUMMY_CLIENT,
                annotations: () => {
                    throw new Error('erroringProvider')
                },
            },
            settings: {},
        }
        const values = await allValuesFrom(
            observeAnnotations<Range>(
                observableOfTimedSequence(
                    0,
                    [
                        erroringProvider,
                        {
                            uri: 'a',
                            providerClient: {
                                ...DUMMY_CLIENT,
                                annotations: () => Promise.resolve([fixtureAnn('b', 'a')]),
                            },
                            settings: {},
                        },
                    ],
                    0,
                    [erroringProvider],
                    0,
                    [
                        {
                            uri: 'c',
                            providerClient: {
                                ...DUMMY_CLIENT,
                                annotations: () => Promise.resolve([fixtureAnn('b', 'c')]),
                            },
                            settings: {},
                        },
                    ],
                ),
                FIXTURE_ANNOTATIONS_PARAMS,
                optsExpectingError,
            ),
        )
        expect(values).toStrictEqual<typeof values>([[fixtureAnn('b', 'a')], [], [fixtureAnn('b', 'c')]])
        expect(errorHookCalled).toBe(2) // TODO(sqs): was 1 in RxJS
    })

    test('config changes', async () => {
        const values = await allValuesFrom(
            observeAnnotations<Range>(
                Observable.of(
                    [
                        {
                            uri: 'a',
                            providerClient: {
                                ...DUMMY_CLIENT,
                                annotations: () => Promise.resolve([fixtureAnn('a', 'a')]),
                            },
                            settings: {},
                        },
                    ],
                    [
                        {
                            uri: 'a',
                            providerClient: {
                                ...DUMMY_CLIENT,
                                annotations: () => Promise.resolve([fixtureAnn('a', 'a')]),
                            },
                            settings: {},
                        },
                        {
                            uri: 'b',
                            providerClient: {
                                ...DUMMY_CLIENT,
                                annotations: () => Promise.resolve([fixtureAnn('b', 'b')]),
                            },
                            settings: {},
                        },
                    ],
                ),
                FIXTURE_ANNOTATIONS_PARAMS,
                OPTS,
            ),
        )
        expect(values).toStrictEqual<typeof values>([
            [fixtureAnn('a', 'a')],
            [fixtureAnn('a', 'a'), fixtureAnn('b', 'b')],
        ])
    })
})
