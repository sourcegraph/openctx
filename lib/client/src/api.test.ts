import type { AnnotationsParams, ItemsParams } from '@openctx/protocol'
import type { Item, Range } from '@openctx/schema'
import { of } from 'rxjs'
import { TestScheduler } from 'rxjs/testing'
import { describe, expect, test } from 'vitest'
import {
    type Annotation,
    type EachWithProviderUri,
    type ProviderClientWithSettings,
    observeAnnotations,
    observeItems,
} from './api.js'
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

const testScheduler = (): TestScheduler =>
    new TestScheduler((actual, expected) => expect(actual).toStrictEqual(expected))

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

    test('simple', () => {
        testScheduler().run(({ cold, expectObservable }) => {
            expectObservable(
                observeItems(
                    cold<ProviderClientWithSettings[]>('a', {
                        a: [
                            {
                                uri: 'a',
                                providerClient: {
                                    ...DUMMY_CLIENT,
                                    items: () => of([fixtureItem('a', 'a')]),
                                },
                                settings: {},
                            },
                        ],
                    }),
                    FIXTURE_ITEMS_PARAMS,
                    OPTS,
                ),
            ).toBe('a', { a: [fixtureItem('a', 'a')] } satisfies Record<string, Item[]>)
        })
    })

    test('no providers', () => {
        testScheduler().run(({ cold, expectObservable }) => {
            expectObservable(
                observeItems(
                    cold<ProviderClientWithSettings[]>('a', {
                        a: [],
                    }),
                    FIXTURE_ITEMS_PARAMS,
                    OPTS,
                ),
            ).toBe('a', { a: [] } satisfies Record<string, Item[]>)
        })
    })

    test('2 providers', () => {
        testScheduler().run(({ cold, expectObservable }) => {
            expectObservable(
                observeItems(
                    cold<ProviderClientWithSettings[]>('a', {
                        a: [
                            {
                                uri: 'a',
                                providerClient: {
                                    ...DUMMY_CLIENT,
                                    items: () => of([fixtureItem('a', 'a')]),
                                },
                                settings: {},
                            },
                            {
                                uri: 'b',
                                providerClient: {
                                    ...DUMMY_CLIENT,
                                    items: () => of([fixtureItem('b', 'b')]),
                                },
                                settings: {},
                            },
                        ],
                    }),
                    FIXTURE_ITEMS_PARAMS,
                    OPTS,
                ),
            ).toBe('a', {
                a: [fixtureItem('a', 'a'), fixtureItem('b', 'b')],
            } satisfies Record<string, Item[]>)
        })
    })

    test('provider error', () => {
        let errorHookCalled = 0
        const optsExpectingError = {
            ...OPTS,
            errorHook: (providerUri: string, err: any) => {
                errorHookCalled++
                expect(providerUri).toBe('a')
                expect(err.message).toBe('erroringProvider')
            },
        }
        testScheduler().run(({ cold, expectObservable }) => {
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
            expectObservable(
                observeItems(
                    cold<ProviderClientWithSettings[]>('a', {
                        a: [
                            erroringProvider,
                            {
                                uri: 'a',
                                providerClient: {
                                    ...DUMMY_CLIENT,
                                    items: () => of([fixtureItem('b', 'a')]),
                                },
                                settings: {},
                            },
                        ],

                        b: [erroringProvider],

                        c: [
                            {
                                uri: 'c',
                                providerClient: {
                                    ...DUMMY_CLIENT,
                                    items: () => of([fixtureItem('b', 'c')]),
                                },
                                settings: {},
                            },
                        ],
                    }),
                    FIXTURE_ITEMS_PARAMS,
                    optsExpectingError,
                ),
            ).toBe('a', {
                a: [fixtureItem('b', 'a')],
                b: [],
                c: [fixtureItem('b', 'c')],
            } satisfies Record<string, Item[]>)
        })
        expect(errorHookCalled).toBe(1)
    })

    test('config changes', () => {
        testScheduler().run(({ cold, expectObservable }) => {
            expectObservable(
                observeItems(
                    cold<ProviderClientWithSettings[]>('a-b', {
                        a: [
                            {
                                uri: 'a',
                                providerClient: {
                                    ...DUMMY_CLIENT,
                                    items: () => of([fixtureItem('a', 'a')]),
                                },
                                settings: {},
                            },
                        ],
                        b: [
                            {
                                uri: 'a',
                                providerClient: {
                                    ...DUMMY_CLIENT,
                                    items: () => of([fixtureItem('a', 'a')]),
                                },
                                settings: {},
                            },
                            {
                                uri: 'b',
                                providerClient: {
                                    ...DUMMY_CLIENT,
                                    items: () => of([fixtureItem('b', 'b')]),
                                },
                                settings: {},
                            },
                        ],
                    }),
                    FIXTURE_ITEMS_PARAMS,
                    OPTS,
                ),
            ).toBe('a-b', {
                a: [fixtureItem('a', 'a')],
                b: [fixtureItem('a', 'a'), fixtureItem('b', 'b')],
            } satisfies Record<string, Item[]>)
        })
    })
})

describe('observeAnnotations', () => {
    const OPTS: Parameters<typeof observeAnnotations>[2] = { makeRange: r => r, emitPartial: false }

    test('simple', () => {
        testScheduler().run(({ cold, expectObservable }) => {
            expectObservable(
                observeAnnotations<Range>(
                    cold<ProviderClientWithSettings[]>('a', {
                        a: [
                            {
                                uri: 'a',
                                providerClient: {
                                    ...DUMMY_CLIENT,
                                    annotations: () => of([fixtureAnn('a', 'a')]),
                                },
                                settings: {},
                            },
                        ],
                    }),
                    FIXTURE_ANNOTATIONS_PARAMS,
                    OPTS,
                ),
            ).toBe('a', { a: [fixtureAnn('a', 'a')] } satisfies Record<
                string,
                EachWithProviderUri<Annotation[]>
            >)
        })
    })

    test('no providers', () => {
        testScheduler().run(({ cold, expectObservable }) => {
            expectObservable(
                observeAnnotations<Range>(
                    cold<ProviderClientWithSettings[]>('a', {
                        a: [],
                    }),
                    FIXTURE_ANNOTATIONS_PARAMS,
                    OPTS,
                ),
            ).toBe('a', { a: [] } satisfies Record<string, Annotation[]>)
        })
    })

    test('2 providers', () => {
        testScheduler().run(({ cold, expectObservable }) => {
            expectObservable(
                observeAnnotations<Range>(
                    cold<ProviderClientWithSettings[]>('a', {
                        a: [
                            {
                                uri: 'a',
                                providerClient: {
                                    ...DUMMY_CLIENT,
                                    annotations: () => of([fixtureAnn('a', 'a')]),
                                },
                                settings: {},
                            },
                            {
                                uri: 'b',
                                providerClient: {
                                    ...DUMMY_CLIENT,
                                    annotations: () => of([fixtureAnn('b', 'b')]),
                                },
                                settings: {},
                            },
                        ],
                    }),
                    FIXTURE_ANNOTATIONS_PARAMS,
                    OPTS,
                ),
            ).toBe('a', { a: [fixtureAnn('a', 'a'), fixtureAnn('b', 'b')] } satisfies Record<
                string,
                Annotation[]
            >)
        })
    })

    test('provider error', () => {
        let errorHookCalled = 0
        const optsExpectingError = {
            ...OPTS,
            errorHook: (providerUri: string, err: any) => {
                errorHookCalled++
                expect(providerUri).toBe('a')
                expect(err.message).toBe('erroringProvider')
            },
        }
        testScheduler().run(({ cold, expectObservable }) => {
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
            expectObservable(
                observeAnnotations<Range>(
                    cold<ProviderClientWithSettings[]>('a', {
                        a: [
                            erroringProvider,
                            {
                                uri: 'a',
                                providerClient: {
                                    ...DUMMY_CLIENT,
                                    annotations: () => of([fixtureAnn('b', 'a')]),
                                },
                                settings: {},
                            },
                        ],

                        b: [erroringProvider],

                        c: [
                            {
                                uri: 'c',
                                providerClient: {
                                    ...DUMMY_CLIENT,
                                    annotations: () => of([fixtureAnn('b', 'c')]),
                                },
                                settings: {},
                            },
                        ],
                    }),
                    FIXTURE_ANNOTATIONS_PARAMS,
                    optsExpectingError,
                ),
            ).toBe('a', {
                a: [fixtureAnn('b', 'a')],
                b: [],
                c: [fixtureAnn('b', 'c')],
            } satisfies Record<string, Annotation[]>)
        })
        expect(errorHookCalled).toBe(1)
    })

    test('config changes', () => {
        testScheduler().run(({ cold, expectObservable }) => {
            expectObservable(
                observeAnnotations<Range>(
                    cold<ProviderClientWithSettings[]>('a-b', {
                        a: [
                            {
                                uri: 'a',
                                providerClient: {
                                    ...DUMMY_CLIENT,
                                    annotations: () => of([fixtureAnn('a', 'a')]),
                                },
                                settings: {},
                            },
                        ],
                        b: [
                            {
                                uri: 'a',

                                providerClient: {
                                    ...DUMMY_CLIENT,
                                    annotations: () => of([fixtureAnn('a', 'a')]),
                                },
                                settings: {},
                            },
                            {
                                uri: 'b',
                                providerClient: {
                                    ...DUMMY_CLIENT,
                                    annotations: () => of([fixtureAnn('b', 'b')]),
                                },
                                settings: {},
                            },
                        ],
                    }),
                    FIXTURE_ANNOTATIONS_PARAMS,
                    OPTS,
                ),
            ).toBe('a-b', {
                a: [fixtureAnn('a', 'a')],
                b: [fixtureAnn('a', 'a'), fixtureAnn('b', 'b')],
            } satisfies Record<string, Annotation[]>)
        })
    })
})
