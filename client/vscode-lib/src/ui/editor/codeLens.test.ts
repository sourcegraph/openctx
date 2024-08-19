import type { Annotation, AnnotationsParams, EachWithProviderUri, Item } from '@openctx/client'
import { allValuesFrom } from '@openctx/client/observable'
import { Observable } from 'observable-fns'
import { type MockedObject, describe, expect, test, vi } from 'vitest'
import type * as vscode from 'vscode'
import { URI } from 'vscode-uri'
import type { Controller } from '../../controller.js'
import { createMockController } from '../../controller.test.js'
import { createPosition, createRange, mockTextDocument } from '../../util/vscode.test.js'
import { createCodeLensProvider } from './codeLens.js'

type RecursivePartial<T> = {
    [P in keyof T]?: RecursivePartial<T[P]>
}

vi.mock(
    'vscode',
    () =>
        ({
            // biome-ignore lint/complexity/useArrowFunction: mock vscode
            Range: function (): vscode.Range {
                return createRange(0, 0, 0, 0)
            } as any,
            // biome-ignore lint/complexity/useArrowFunction: mock vscode
            EventEmitter: function (): any {
                return { fire: vi.fn(), event: null }
            } as any,
            Uri: URI,
            commands: {
                registerCommand: vi.fn(),
            },
            window: {
                createQuickPick: vi.fn(() => ({ onDidAccept: () => {} })),
            },
            workspace: {
                onDidCloseTextDocument: vi.fn(),
            },
        }) satisfies RecursivePartial<typeof vscode>,
)

function fixtureAnn(label: string): EachWithProviderUri<Annotation<vscode.Range>[]>[0] {
    return {
        uri: 'file:///f',
        range: createRange(0, 0, 0, 1),
        item: fixtureItem(label),
        providerUri: 'foo',
    }
}

function fixtureItem(label: string): Item {
    return { title: label.toUpperCase() }
}

function createTestProvider(): {
    controller: MockedObject<Controller>
    provider: ReturnType<typeof createCodeLensProvider>
} {
    const controller = createMockController()
    return { controller, provider: createCodeLensProvider(controller) }
}

describe('createCodeLensProvider', () => {
    test('simple', async () => {
        const { controller, provider } = createTestProvider()
        const doc = mockTextDocument()
        controller.annotationsChanges.mockImplementation((params: AnnotationsParams) => {
            expect(params).toBe(params)
            return Observable.of<EachWithProviderUri<Annotation<vscode.Range>[]>>([fixtureAnn('a')])
        })

        const values0 = await allValuesFrom(provider.observeCodeLenses(doc))
        expect(values0).toStrictEqual<typeof values0>([
            [
                {
                    isResolved: true,
                    range: createRange(0, 0, 0, 1),
                    command: { title: 'A', command: 'noop' },
                },
            ],
        ])

        const values1 = await provider.provideCodeLenses(
            doc,
            null as unknown as vscode.CancellationToken,
        )
        expect(values1).toStrictEqual<typeof values1>([
            {
                isResolved: true,
                range: createRange(0, 0, 0, 1),
                command: { title: 'A', command: 'noop' },
            },
        ])
    })

    test('multiple emissions', async () => {
        const { controller, provider } = createTestProvider()
        const doc = mockTextDocument()

        controller.annotationsChanges.mockImplementation(params => {
            expect(params).toBe(params)
            return Observable.of([fixtureAnn('a')], [fixtureAnn('b')])
        })
        const observable = provider.observeCodeLenses(doc)

        const values = await allValuesFrom(observable)
        expect(values).toStrictEqual<typeof values>([
            [
                {
                    isResolved: true,
                    range: createRange(0, 0, 0, 1),
                    command: { title: 'A', command: 'noop' },
                },
            ],
            [
                {
                    isResolved: true,
                    range: createRange(0, 0, 0, 1),
                    command: { title: 'B', command: 'noop' },
                },
            ],
        ])

        expect(
            await provider.provideCodeLenses(doc, null as unknown as vscode.CancellationToken),
        ).toStrictEqual([
            {
                isResolved: true,
                range: createRange(0, 0, 0, 1),
                command: { title: 'A', command: 'noop' },
            },
        ])
    })

    test('detail hover', async () => {
        const { controller, provider } = createTestProvider()
        const doc = mockTextDocument()

        controller.annotationsChanges.mockImplementation(() =>
            Observable.of([
                {
                    providerUri: 'foo',
                    uri: 'file:///f',
                    item: { title: 'A', ui: { hover: { text: 'D' } } },
                },
            ]),
        )

        const values = await allValuesFrom(provider.observeCodeLenses(doc))
        expect(values).toStrictEqual<typeof values>([
            [
                {
                    isResolved: true,
                    range: createRange(0, 0, 0, 0),
                    command: {
                        title: 'A',
                        command: 'openctx._showHover',
                        arguments: [doc.uri, createPosition(0, 0)],
                    },
                },
            ],
        ])
    })

    test('prefer-link-over-detail', async () => {
        const { controller, provider } = createTestProvider()
        const doc = mockTextDocument()

        controller.annotationsChanges.mockImplementation(params =>
            Observable.of([
                {
                    providerUri: 'foo',
                    uri: 'file:///f',
                    item: {
                        title: 'A',
                        url: 'https://example.com',
                        ui: {
                            hover: { text: 'D' },
                        },
                    },
                    presentationHints: ['prefer-link-over-detail'],
                },
            ]),
        )

        const values = await allValuesFrom(provider.observeCodeLenses(doc))
        expect(values).toStrictEqual<typeof values>([
            [
                {
                    isResolved: true,
                    range: createRange(0, 0, 0, 0),
                    command: {
                        title: 'A',
                        command: 'vscode.open',
                        arguments: [URI.parse('https://example.com')],
                    },
                },
            ],
        ])
    })
})
