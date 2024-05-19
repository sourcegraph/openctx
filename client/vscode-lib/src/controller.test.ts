import { type MockedObject, describe, expect, test, vi } from 'vitest'
import type { Controller } from './controller.js'

export function createMockController(): MockedObject<Controller> {
    return {
        observeMeta: vi.fn(),
        meta: vi.fn(),
        observeMentions: vi.fn(),
        mentions: vi.fn(),
        observeItems: vi.fn(),
        items: vi.fn(),
        observeAnnotations: vi.fn(),
        annotations: vi.fn(),
        client: {
            metaChanges: vi.fn(),
            meta: vi.fn(),
            mentions: vi.fn(),
            mentionsChanges: vi.fn(),
            itemsChanges: vi.fn(),
            items: vi.fn(),
            annotationsChanges: vi.fn(),
            annotations: vi.fn(),
            dispose: vi.fn(),
        },
    }
}

describe('dummy', () =>
    test('dummy', () => {
        expect(true).toBe(true)
    }))
