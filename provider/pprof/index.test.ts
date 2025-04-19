import { beforeEach } from 'node:test'
import type { MetaResult } from '@openctx/provider'
import { beforeAll, describe, expect, test, vi } from 'vitest'
import pprof from './index.js'
import { getPprof } from './pprof.js'

vi.mock('./pprof.js', async () => {
    const actualPprof = await vi.importActual('./pprof.js')
    return { ...actualPprof, getPprof: vi.fn() }
})
const getPprofMock = vi.mocked(getPprof)

describe('pprof', () => {
    let actualPprof: typeof import('./pprof.js') | undefined
    beforeAll(async () => {
        actualPprof = await vi.importActual<typeof import('./pprof.js')>('./pprof.js')
    })

    beforeEach(async () => {
        vi.clearAllMocks()

        // All tests should use the actual implementation, we just want to spy on the calls.
        // We also know that the original module is available, because it's imported in the beforeAll hook.
        getPprofMock.mockImplementationOnce(actualPprof!.getPprof)
    })

    test('meta', () =>
        expect(pprof.meta({}, {})).toStrictEqual<MetaResult>({
            name: 'pprof',
            annotations: {
                selectors: [{ path: '**/*.go' }],
            },
        }))

    test('annotations for a test file', () => {
        const content = 'package pkg_test\nfunc DoStuff() {}\n'

        expect(
            pprof.annotations!(
                {
                    uri: '/pkg/thing_test.go',
                    content: content,
                },
                {},
            ),
        ).toHaveLength(0)
        expect(getPprofMock).not.toBeCalled()
    })
})
