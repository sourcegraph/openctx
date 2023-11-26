import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { esmToCommonJS } from './dynamicImport'

vi.mock('vscode', () => ({
    env: { uiKind: 1 },
    UIKind: { Desktop: 1 },
}))

describe('esmToCommonJS', () => {
    beforeEach(() => {
        process.env.DESKTOP_BUILD = 'true'
    })
    afterEach(() => {
        delete process.env.DESKTOP_BUILD
    })

    test('works', async () => {
        expect(await esmToCommonJS('export default 123')).toContain('var stdin_default = 123')
    })
})
