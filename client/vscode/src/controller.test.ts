import { type MockedObject, describe, expect, test, vi } from 'vitest'
import type { Controller } from './controller'

export function createMockController(): MockedObject<Controller> {
    return {
        observeItems: vi.fn(),
        items: vi.fn(),
        observeAnnotations: vi.fn(),
        annotations: vi.fn(),
    }
}

describe('dummy', () =>
    test('dummy', () => {
        expect(true).toBe(true)
    }))
