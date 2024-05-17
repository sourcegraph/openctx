import { describe, expect, test, vi } from 'vitest'
import { importESMFromString } from './importHelpers.js'

vi.mock('vscode', () => ({
    env: { uiKind: 1 },
    UIKind: { Desktop: 1 },
}))

describe('importESMFromString', () => {
    test('works', async () =>
        expect({ ...((await importESMFromString('export default 123')) as any) }).toEqual({
            default: 123,
        }))
})
