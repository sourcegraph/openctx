import { describe, expect, test } from 'vitest'
import { prepareItemsForPresentation } from './ui'

describe('prepareItemsForPresentation', () => {
    test('sorts', () => {
        expect(
            prepareItemsForPresentation([
                {
                    title: '📟 http_request_reqs (metric 1)',
                    range: {
                        start: { line: 3, character: 4 },
                        end: { line: 5, character: 6 },
                    },
                },
                {
                    title: '📟 http_request_queue (metric 2)',
                    range: {
                        start: { line: 2, character: 4 },
                        end: { line: 2, character: 6 },
                    },
                },
            ])
        ).toEqual<ReturnType<typeof prepareItemsForPresentation>>([
            {
                title: '📟 http_request_queue (metric 2)',
                range: {
                    start: { line: 2, character: 4 },
                    end: { line: 2, character: 6 },
                },
            },
            {
                title: '📟 http_request_reqs (metric 1)',
                range: {
                    start: { line: 3, character: 4 },
                    end: { line: 5, character: 6 },
                },
            },
        ])
    })
})
