import { type MockedObject, describe, expect, test, vi } from 'vitest'
import type { Controller } from './controller.js'

export function createMockController(): MockedObject<Controller> {
    return {
        observeMeta: vi.fn(),
        meta: vi.fn(),
        metaChanges__asyncGenerator: vi.fn(),
        observeMentions: vi.fn(),
        mentions: vi.fn(),
        mentionsChanges__asyncGenerator: vi.fn(),
        observeItems: vi.fn(),
        items: vi.fn(),
        itemsChanges__asyncGenerator: vi.fn(),
        observeAnnotations: vi.fn(),
        annotations: vi.fn(),
        annotationsChanges__asyncGenerator: vi.fn(),
    }
}

describe('dummy', () =>
    test('dummy', () => {
        expect(true).toBe(true)
    }))
