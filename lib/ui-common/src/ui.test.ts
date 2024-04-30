import { describe, expect, test } from 'vitest'
import { prepareAnnotationsForPresentation } from './ui'

describe('prepareAnnotationsForPresentation', () => {
    test('sorts', () => {
        expect(
            prepareAnnotationsForPresentation([
                {
                    uri: 'file:///f',
                    range: {
                        start: { line: 3, character: 4 },
                        end: { line: 5, character: 6 },
                    },
                    item: { title: '1' },
                },
                {
                    uri: 'file:///f',

                    range: {
                        start: { line: 2, character: 4 },
                        end: { line: 2, character: 6 },
                    },
                    item: { title: '2' },
                },
            ])
        ).toEqual<ReturnType<typeof prepareAnnotationsForPresentation>>([
            {
                uri: 'file:///f',

                range: {
                    start: { line: 2, character: 4 },
                    end: { line: 2, character: 6 },
                },
                item: { title: '2' },
            },
            {
                uri: 'file:///f',
                range: {
                    start: { line: 3, character: 4 },
                    end: { line: 5, character: 6 },
                },
                item: { title: '1' },
            },
        ])
    })
})
