import { describe, expect, test } from 'vitest'
import { toLineRangeStrings } from './toLineRangeStrings.js'

describe('toLineRangeStrings', () => {
    test('empty', () => expect(toLineRangeStrings([])).toEqual([]))

    test('single line', () => expect(toLineRangeStrings([1])).toEqual(['1']))

    test('contiguous lines', () => expect(toLineRangeStrings([1, 2, 3])).toEqual(['1-3']))

    test('non-sequential lines', () => expect(toLineRangeStrings([10, 0, 1])).toEqual(['10', '0-1']))

    test('non-contiguous lines', () =>
        expect(toLineRangeStrings([1, 3, 5, 6])).toEqual(['1', '3', '5-6']))
})
