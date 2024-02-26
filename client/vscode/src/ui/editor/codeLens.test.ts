import type { Item } from '@openctx/client'
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
                return { event: null }
            } as any,
            Uri: URI,
            commands: {
                registerCommand: vi.fn(),
            },
            window: {
                createQuickPick: vi.fn(() => ({ onDidAccept: () => {} })),
            },
        }) satisfies RecursivePartial<typeof vscode>
)

function fixtureResult(label: string): Item<vscode.Range> {
    return {
        title: label.toUpperCase(),
        range: createRange(0, 0, 0, 1),
    }
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

    test('simple', () => {
        const { controller, provider } = createTestProvider()
        const doc = mockTextDocument()
        testScheduler().run(({ cold, expectObservable }): void => {
            controller.observeItems.mockImplementation(doc => {
                expect(doc).toBe(doc)
                return cold<Item<vscode.Range>[] | null>('a', { a: [fixtureResult('a')] })
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
    })

    test('detail hover', () => {
        const { controller, provider } = createTestProvider()
        const doc = mockTextDocument()
        testScheduler().run(({ cold, expectObservable }): void => {
            controller.observeItems.mockImplementation(doc =>
                cold<Item<vscode.Range>[] | null>('a', {
                    a: [{ title: 'A', ui: { hover: { text: 'D' } } }],
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
            controller.observeItems.mockImplementation(doc =>
                cold<Item<vscode.Range>[] | null>('a', {
                    a: [
                        {
                            title: 'A',
                            url: 'https://example.com',
                            ui: {
                                hover: { text: 'D' },
                                presentationHints: ['prefer-link-over-detail'],
                            },
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
