import type { MetaResult } from '@openctx/provider'
import { describe, expect, test } from 'vitest'
import pprof from './index.js'

describe('pprof', () => {
    test('meta', () =>
        expect(pprof.meta({}, {})).toStrictEqual<MetaResult>({
            name: 'pprof',
            annotations: {
                selectors: [{ path: '**/*.go' }],
            },
        }))
})
