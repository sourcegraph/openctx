import type { AnnotationsParams, ItemsParams, MetaResult } from '@openctx/protocol'
import type { Item, Range } from '@openctx/schema'
import { Observable, firstValueFrom, of } from 'rxjs'
import { TestScheduler } from 'rxjs/testing'
import { describe, expect, test } from 'vitest'
import type { Annotation, EachWithProviderUri } from '../api.js'
import type { ConfigurationUserInput } from '../configuration.js'
import { type Client, type ClientEnv, createClient } from './client.js'

function testdataFileUri(file: string): string {
    return `file://${__dirname}/testdata/${file}`
}

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

function createTestClient(
    env: Partial<ClientEnv<Range>> & Required<Pick<ClientEnv<Range>, 'configuration'>>,
): Client<Range> {
    return createClient<Range>({
        authInfo: () => of(null),
        makeRange: r => r,
        ...env,
    })
}

describe('Client', () => {
    const testScheduler = (): TestScheduler =>
        new TestScheduler((actual, expected) => expect(actual).toStrictEqual(expected))

    describe('meta', () => {
        test('metaChanges__asyncGenerator', async () => {
            const client = createTestClient({
                configuration: () =>
                    new Observable(observer => {
                        observer.next({ enable: false, providers: {} })
                        observer.next({
                            enable: true,
                            providers: { [testdataFileUri('simpleMeta.js')]: { nameSuffix: '1' } },
                        })
                        observer.next({
                            enable: true,
                            providers: { [testdataFileUri('simpleMeta.js')]: { nameSuffix: '2' } },
                        })
                        observer.complete()
                    }),
            })

            const values: EachWithProviderUri<MetaResult[]>[] = []
            const signal = new AbortController().signal
            for await (const value of client.metaChanges__asyncGenerator({}, {}, signal)) {
                values.push(value)
            }
            expect(values).toStrictEqual<typeof values>([
                [],
                [{ name: 'simpleMeta-1', providerUri: testdataFileUri('simpleMeta.js') }],
                [{ name: 'simpleMeta-2', providerUri: testdataFileUri('simpleMeta.js') }],
            ])
        })
    })

    describe('items', () => {
        test('with providers', async () => {
            const client = createTestClient({
                configuration: () =>
                    Promise.resolve({ enable: true, providers: { [testdataFileUri('simple.js')]: {} } }),
            })

            const items = await client.items(FIXTURE_ITEMS_PARAMS)
            expect(items).toStrictEqual<typeof items>([
                { title: 'A', providerUri: testdataFileUri('simple.js') },
            ])
        })

        test('no providers', async () => {
            const client = createTestClient({
                configuration: () => Promise.resolve({ providers: {} }),
            })

            const items = await firstValueFrom(client.itemsChanges(FIXTURE_ITEMS_PARAMS))
            expect(items).toStrictEqual<typeof items>([])
        })

        test('changes', () => {
            testScheduler().run(({ cold, expectObservable }) => {
                expectObservable(
                    createTestClient({
                        authInfo: () => cold('a', { a: null }),
                        configuration: () =>
                            cold<ConfigurationUserInput>('a', {
                                a: { enable: true, providers: { [testdataFileUri('simple.js')]: {} } },
                            }),
                        __mock__: {
                            getProviderClient: () => ({
                                items: () =>
                                    of([
                                        {
                                            ...fixtureItem('a'),
                                            providerUri: testdataFileUri('simple.js'),
                                        },
                                    ]),
                            }),
                        },
                    }).itemsChanges(FIXTURE_ITEMS_PARAMS),
                ).toBe('(0a)', {
                    '0': [],
                    a: [{ ...fixtureItem('a'), providerUri: testdataFileUri('simple.js') }],
                } satisfies Record<string, EachWithProviderUri<Item[]>>)
            })
        })
    })

    describe('annotations', () => {
        test('with providers', async () => {
            const client = createTestClient({
                configuration: () =>
                    Promise.resolve({ enable: true, providers: { [testdataFileUri('simple.js')]: {} } }),
            })

            const anns = await client.annotations(FIXTURE_ANNOTATIONS_PARAMS)
            expect(anns).toStrictEqual<typeof anns>([
                {
                    uri: FIXTURE_ANNOTATIONS_PARAMS.uri,
                    range: { start: { line: 1, character: 2 }, end: { line: 3, character: 4 } },
                    item: { title: 'A' },
                    providerUri: testdataFileUri('simple.js'),
                },
            ])
        })

        test('no providers', async () => {
            const client = createTestClient({
                configuration: () => Promise.resolve({ providers: {} }),
            })

            const anns = await firstValueFrom(client.annotationsChanges(FIXTURE_ANNOTATIONS_PARAMS))
            expect(anns).toStrictEqual<typeof anns>([])
        })

        test('changes', () => {
            testScheduler().run(({ cold, expectObservable }) => {
                expectObservable(
                    createTestClient({
                        authInfo: () => cold('a', { a: null }),
                        configuration: () =>
                            cold<ConfigurationUserInput>('a', {
                                a: { enable: true, providers: { [testdataFileUri('simple.js')]: {} } },
                            }),
                        __mock__: {
                            getProviderClient: () => ({ annotations: () => of([fixtureAnn('a')]) }),
                        },
                    }).annotationsChanges(FIXTURE_ANNOTATIONS_PARAMS),
                ).toBe('(0a)', {
                    '0': [],
                    a: [{ ...fixtureAnn('a'), providerUri: testdataFileUri('simple.js') }],
                } satisfies Record<string, EachWithProviderUri<Annotation[]>>)
            })
        })
    })
})
