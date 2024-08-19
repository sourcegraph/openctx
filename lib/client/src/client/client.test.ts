import type { AnnotationsParams, ItemsParams, MetaResult } from '@openctx/protocol'
import type { Item, Range } from '@openctx/schema'
import { Observable } from 'observable-fns'
import { describe, expect, test } from 'vitest'
import type { Annotation, EachWithProviderUri } from '../api.js'
import type { ConfigurationUserInput, ImportedProviderConfiguration } from '../configuration.js'
import {
    allValuesFrom,
    firstValueFrom,
    observableOfTimedSequence,
    readValuesFrom,
} from '../misc/observable.js'
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
        authInfo: () => Observable.of(null),
        makeRange: r => r,
        ...env,
    })
}

describe('Client', () => {
    describe('meta', () => {
        test('promise', async () => {
            const client = createTestClient({
                configuration: () =>
                    Promise.resolve({
                        enable: true,
                        providers: {
                            [testdataFileUri('simple.js')]: true,
                        },
                    }),
            })
            expect(await client.meta({}, {})).toStrictEqual<EachWithProviderUri<MetaResult[]>>([
                { name: 'simple', providerUri: testdataFileUri('simple.js'), annotations: {} },
            ])
        })

        test('simple', async () => {
            expect(
                await allValuesFrom(
                    createTestClient({
                        configuration: () =>
                            Observable.of<ConfigurationUserInput>({
                                enable: true,
                                providers: {
                                    [testdataFileUri('simple.js')]: true,
                                },
                            }),
                        __mock__: {
                            getProviderClient: () => ({
                                meta: (_, settings) => Observable.of({ name: 'simple' }),
                            }),
                        },
                    }).metaChanges({}, {}),
                ),
            ).toStrictEqual<EachWithProviderUri<MetaResult[]>[]>([
                [{ name: 'simple', providerUri: testdataFileUri('simple.js') }],
            ])
        })

        test('changes', async () => {
            const client = createTestClient({
                authInfo: () => Observable.of(null),
                configuration: () =>
                    observableOfTimedSequence<ConfigurationUserInput>(
                        { enable: false },
                        0,
                        {
                            enable: true,
                            providers: {
                                [testdataFileUri('simpleMeta.js')]: { nameSuffix: '1' },
                            },
                        },
                        0,
                        {
                            enable: true,
                            providers: {
                                [testdataFileUri('simpleMeta.js')]: { nameSuffix: '2' },
                            },
                        },
                    ),
                providers: Observable.of<ImportedProviderConfiguration[]>([]),
                __mock__: {
                    getProviderClient: () => ({
                        meta: (_, settings) =>
                            Observable.of({
                                name: `simpleMeta-${settings.nameSuffix}`,
                                annotations: {},
                            }),
                    }),
                },
            })

            const { values, done } = readValuesFrom(client.metaChanges({}, {}))
            await done

            expect(values).toStrictEqual<typeof values>([
                [],
                [
                    {
                        name: 'simpleMeta-1',
                        providerUri: testdataFileUri('simpleMeta.js'),
                        annotations: {},
                    },
                ],
                [
                    {
                        name: 'simpleMeta-2',
                        providerUri: testdataFileUri('simpleMeta.js'),
                        annotations: {},
                    },
                ],
            ])
        })

        test('providers option', async () => {
            const client = createTestClient({
                configuration: () => Observable.of({ enable: true }),
                providers: Observable.of([
                    {
                        provider: { meta: () => ({ name: 'my-provider-2' }) },
                        providerUri: 'u2',
                        settings: true,
                    },
                    {
                        provider: { meta: () => ({ name: 'my-provider-3' }) },
                        providerUri: 'u3',
                        settings: true,
                    },
                ]),
            })
            expect(await client.meta({}, {})).toStrictEqual<EachWithProviderUri<MetaResult[]>>([
                { name: 'my-provider-2', providerUri: 'u2' },
                { name: 'my-provider-3', providerUri: 'u3' },
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

        test('changes', async () => {
            const client = createTestClient({
                authInfo: () => Observable.of(null),
                configuration: () =>
                    Observable.of({
                        enable: true,
                        providers: { [testdataFileUri('simple.js')]: {} },
                    }),
                __mock__: {
                    getProviderClient: () => ({
                        items: () =>
                            Observable.of([
                                {
                                    ...fixtureItem('a'),
                                    providerUri: testdataFileUri('simple.js'),
                                },
                            ]),
                    }),
                },
            })

            const { values, done } = readValuesFrom(client.itemsChanges(FIXTURE_ITEMS_PARAMS))
            await done

            expect(values).toStrictEqual([
                [{ ...fixtureItem('a'), providerUri: testdataFileUri('simple.js') }],
            ])
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

        test('changes', async () => {
            const client = createTestClient({
                authInfo: () => Observable.of(null),
                configuration: () =>
                    Observable.of<ConfigurationUserInput>({
                        enable: true,
                        providers: { [testdataFileUri('simple.js')]: {} },
                    }),
                __mock__: {
                    getProviderClient: () => ({
                        annotations: () => Observable.of([fixtureAnn('a')]),
                    }),
                },
            })

            const { values, done } = readValuesFrom(
                client.annotationsChanges(FIXTURE_ANNOTATIONS_PARAMS),
            )
            await done

            expect(values).toStrictEqual([
                [{ ...fixtureAnn('a'), providerUri: testdataFileUri('simple.js') }],
            ])
        })
    })
})
