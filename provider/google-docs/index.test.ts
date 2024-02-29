import type { AnnotationsResult } from '@openctx/provider'
import { describe, expect, test } from 'vitest'
import googleDocs, { type Settings } from './index'

describe('googleDocs', () => {
    const SETTINGS: Settings = {}

    test('items', () => {
        expect(googleDocs.items?.({ query: 'foo' }, SETTINGS)).toEqual<AnnotationsResult>([
            {
                uri: 'file:///a/b.go',
                range: {
                    start: { line: 2, character: 14 },
                    end: { line: 2, character: 28 },
                },
                item: {
                    title: '📟 Prometheus metric: random_numbers',
                    url: 'https://example.com/?q=random_numbers',
                },
            },
        ])
    })
})
