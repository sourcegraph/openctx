import { type MockedObject, describe, expect, test, vi } from 'vitest'
import type { Controller } from './controller'

export function createMockController(): MockedObject<Controller> {
    return {
        observeItems: vi.fn(),
        onDidChangeProviders: vi.fn(),
    }
}

describe('dummy', () =>
    test('dummy', () => {
        expect(true).toBe(true)
    }))
