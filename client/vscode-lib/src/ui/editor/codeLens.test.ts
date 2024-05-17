import type { Annotation, Item } from '@openctx/client'
import { TestScheduler } from 'rxjs/testing'
import { type MockedObject, describe, expect, test, vi } from 'vitest'
import type * as vscode from 'vscode'
import { URI } from 'vscode-uri'
import type { Controller } from '../../controller'
import { createMockController } from '../../controller.test'
import { createPosition, createRange, mockTextDocument } from '../../util/vscode.test'
import { createCodeLensProvider } from './codeLens'

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
        }) satisfies RecursivePartial<typeof vscode>
)

function fixtureAnn(label: string): Annotation<vscode.Range> {
    return {
        uri: 'file:///f',
        range: createRange(0, 0, 0, 1),
        item: fixtureItem(label),
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
    const testScheduler = (): TestScheduler =>
        new TestScheduler((actual, expected) => expect(actual).toStrictEqual(expected))

    test('simple', async () => {
        const { controller, provider } = createTestProvider()
        const doc = mockTextDocument()
        testScheduler().run(({ cold, expectObservable }): void => {
            controller.observeAnnotations.mockImplementation(doc => {
                expect(doc).toBe(doc)
                return cold<Annotation<vscode.Range>[] | null>('a', { a: [fixtureAnn('a')] })
            })
            expectObservable(provider.observeCodeLenses(doc)).toBe('a', {
                a: [
                    {
                        isResolved: true,
                        range: createRange(0, 0, 0, 1),
                        command: { title: 'A', command: 'noop' },
                    },
                ],
            } satisfies Record<string, vscode.CodeLens[] | null>)
        })
        expect(
            await provider.provideCodeLenses(doc, null as unknown as vscode.CancellationToken)
        ).toStrictEqual([
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
        testScheduler().run(({ cold, expectObservable }): void => {
            controller.observeAnnotations.mockImplementation(doc => {
                expect(doc).toBe(doc)
                return cold<Annotation<vscode.Range>[] | null>('ab', {
                    a: [fixtureAnn('a')],
                    b: [fixtureAnn('b')],
                })
            })
            expectObservable(provider.observeCodeLenses(doc)).toBe('ab', {
                a: [
                    {
                        isResolved: true,
                        range: createRange(0, 0, 0, 1),
                        command: { title: 'A', command: 'noop' },
                    },
                ],
                b: [
                    {
                        isResolved: true,
                        range: createRange(0, 0, 0, 1),
                        command: { title: 'B', command: 'noop' },
                    },
                ],
            } satisfies Record<string, vscode.CodeLens[] | null>)
        })
        expect(
            await provider.provideCodeLenses(doc, null as unknown as vscode.CancellationToken)
        ).toStrictEqual([
            {
                isResolved: true,
                range: createRange(0, 0, 0, 1),
                command: { title: 'B', command: 'noop' },
            },
        ])
    })

    test('detail hover', () => {
        const { controller, provider } = createTestProvider()
        const doc = mockTextDocument()
        testScheduler().run(({ cold, expectObservable }): void => {
            controller.observeAnnotations.mockImplementation(doc =>
                cold<Annotation<vscode.Range>[] | null>('a', {
                    a: [{ uri: 'file:///f', item: { title: 'A', ui: { hover: { text: 'D' } } } }],
                })
            )
            expectObservable(provider.observeCodeLenses(doc)).toBe('a', {
                a: [
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
            } satisfies Record<string, vscode.CodeLens[] | null>)
        })
    })

    test('prefer-link-over-detail', () => {
        const { controller, provider } = createTestProvider()
        const doc = mockTextDocument()
        testScheduler().run(({ cold, expectObservable }): void => {
            controller.observeAnnotations.mockImplementation(doc =>
                cold<Annotation<vscode.Range>[] | null>('a', {
                    a: [
                        {
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
                    ],
                })
            )
            expectObservable(provider.observeCodeLenses(doc)).toBe('a', {
                a: [
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
            } satisfies Record<string, vscode.CodeLens[] | null>)
        })
    })
})
