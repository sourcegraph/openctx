import { type MockedObject, describe, expect, test, vi } from 'vitest'
import type { Controller } from './controller.js'

export function createMockController(): MockedObject<Controller> {
    return {
        metaChanges: vi.fn(),
        meta: vi.fn(),
        mentionsChanges: vi.fn(),
        mentions: vi.fn(),
        itemsChanges: vi.fn(),
        items: vi.fn(),
        annotationsChanges: vi.fn(),
        annotations: vi.fn(),
    }
}

describe('dummy', () =>
    test('dummy', () => {
        expect(true).toBe(true)
    }))
