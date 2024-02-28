import type { AnnotationsParams, ItemsParams } from '@openctx/protocol'
import type { Item, Range } from '@openctx/schema'
import { of } from 'rxjs'
import { TestScheduler } from 'rxjs/testing'
import { describe, expect, test } from 'vitest'
import {
    type Annotation,
    type ProviderClientWithSettings,
    observeAnnotations,
    observeItems,
} from './api'
import type { ProviderClient } from './providerClient/createProviderClient'

const FIXTURE_ITEMS_PARAMS: ItemsParams = {}

const FIXTURE_ANNOTATIONS_PARAMS: AnnotationsParams = {
    uri: 'file:///f',
    content: 'A',
}

function fixtureItem(label: string): Item {
    return { title: label.toUpperCase() }
}

function fixtureAnn(label: string): Annotation {
    return {
        uri: FIXTURE_ANNOTATIONS_PARAMS.uri,
        range: { start: { line: 0, character: 0 }, end: { line: 0, character: 1 } },
        item: fixtureItem(label),
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
}

describe('observeItems', () => {
    const OPTS: Parameters<typeof observeItems>[2] = { emitPartial: false }

    test('simple', () => {
        testScheduler().run(({ cold, expectObservable }) => {
            expectObservable(
                observeItems(
                    cold<ProviderClientWithSettings[]>('a', {
                        a: [
                            {
                                providerClient: { ...DUMMY_CLIENT, items: () => of([fixtureItem('a')]) },
                                settings: {},
                            },
                        ],
                    }),
                    FIXTURE_ITEMS_PARAMS,
                    OPTS
                )
            ).toBe('a', { a: [fixtureItem('a')] } satisfies Record<string, Item[]>)
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
                    OPTS
                )
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
                                providerClient: { ...DUMMY_CLIENT, items: () => of([fixtureItem('a')]) },
                                settings: {},
                            },
                            {
                                providerClient: { ...DUMMY_CLIENT, items: () => of([fixtureItem('b')]) },
                                settings: {},
                            },
                        ],
                    }),
                    FIXTURE_ITEMS_PARAMS,
                    OPTS
                )
            ).toBe('a', { a: [fixtureItem('a'), fixtureItem('b')] } satisfies Record<string, Item[]>)
        })
    })

    test('provider error', () => {
        testScheduler().run(({ cold, expectObservable }) => {
            const erroringProvider: ProviderClientWithSettings = {
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
                                providerClient: { ...DUMMY_CLIENT, items: () => of([fixtureItem('b')]) },
                                settings: {},
                            },
                        ],

                        b: [erroringProvider],

                        c: [
                            {
                                providerClient: { ...DUMMY_CLIENT, items: () => of([fixtureItem('b')]) },
                                settings: {},
                            },
                        ],
                    }),
                    FIXTURE_ITEMS_PARAMS,
                    OPTS
                )
            ).toBe('a', { a: [fixtureItem('b')], b: [], c: [fixtureItem('b')] } satisfies Record<
                string,
                Item[]
            >)
        })
    })

    test('config changes', () => {
        testScheduler().run(({ cold, expectObservable }) => {
            expectObservable(
                observeItems(
                    cold<ProviderClientWithSettings[]>('a-b', {
                        a: [
                            {
                                providerClient: { ...DUMMY_CLIENT, items: () => of([fixtureItem('a')]) },
                                settings: {},
                            },
                        ],
                        b: [
                            {
                                providerClient: { ...DUMMY_CLIENT, items: () => of([fixtureItem('a')]) },
                                settings: {},
                            },
                            {
                                providerClient: { ...DUMMY_CLIENT, items: () => of([fixtureItem('b')]) },
                                settings: {},
                            },
                        ],
                    }),
                    FIXTURE_ITEMS_PARAMS,
                    OPTS
                )
            ).toBe('a-b', {
                a: [fixtureItem('a')],
                b: [fixtureItem('a'), fixtureItem('b')],
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
                                providerClient: {
                                    ...DUMMY_CLIENT,
                                    annotations: () => of([fixtureAnn('a')]),
                                },
                                settings: {},
                            },
                        ],
                    }),
                    FIXTURE_ANNOTATIONS_PARAMS,
                    OPTS
                )
            ).toBe('a', { a: [fixtureAnn('a')] } satisfies Record<string, Annotation[]>)
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
                    OPTS
                )
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
                                providerClient: {
                                    ...DUMMY_CLIENT,
                                    annotations: () => of([fixtureAnn('a')]),
                                },
                                settings: {},
                            },
                            {
                                providerClient: {
                                    ...DUMMY_CLIENT,
                                    annotations: () => of([fixtureAnn('b')]),
                                },
                                settings: {},
                            },
                        ],
                    }),
                    FIXTURE_ANNOTATIONS_PARAMS,
                    OPTS
                )
            ).toBe('a', { a: [fixtureAnn('a'), fixtureAnn('b')] } satisfies Record<string, Annotation[]>)
        })
    })

    test('provider error', () => {
        testScheduler().run(({ cold, expectObservable }) => {
            const erroringProvider: ProviderClientWithSettings = {
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
                                providerClient: {
                                    ...DUMMY_CLIENT,
                                    annotations: () => of([fixtureAnn('b')]),
                                },
                                settings: {},
                            },
                        ],

                        b: [erroringProvider],

                        c: [
                            {
                                providerClient: {
                                    ...DUMMY_CLIENT,
                                    annotations: () => of([fixtureAnn('b')]),
                                },
                                settings: {},
                            },
                        ],
                    }),
                    FIXTURE_ANNOTATIONS_PARAMS,
                    OPTS
                )
            ).toBe('a', { a: [fixtureAnn('b')], b: [], c: [fixtureAnn('b')] } satisfies Record<
                string,
                Annotation[]
            >)
        })
    })

    test('config changes', () => {
        testScheduler().run(({ cold, expectObservable }) => {
            expectObservable(
                observeAnnotations<Range>(
                    cold<ProviderClientWithSettings[]>('a-b', {
                        a: [
                            {
                                providerClient: {
                                    ...DUMMY_CLIENT,
                                    annotations: () => of([fixtureAnn('a')]),
                                },
                                settings: {},
                            },
                        ],
                        b: [
                            {
                                providerClient: {
                                    ...DUMMY_CLIENT,
                                    annotations: () => of([fixtureAnn('a')]),
                                },
                                settings: {},
                            },
                            {
                                providerClient: {
                                    ...DUMMY_CLIENT,
                                    annotations: () => of([fixtureAnn('b')]),
                                },
                                settings: {},
                            },
                        ],
                    }),
                    FIXTURE_ANNOTATIONS_PARAMS,
                    OPTS
                )
            ).toBe('a-b', {
                a: [fixtureAnn('a')],
                b: [fixtureAnn('a'), fixtureAnn('b')],
            } satisfies Record<string, Annotation[]>)
        })
    })
})
