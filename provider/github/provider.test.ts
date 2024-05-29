import { describe, expect, it } from 'vitest'
import { parseQuery } from './provider.js'

describe('parseQuery', () => {
    it('should return null for invalid input', () => {
        expect(parseQuery('invalid')).toBeNull()
        expect(parseQuery('https://example.com')).toBeNull()
    })

    it('should parse GitHub URLs correctly', () => {
        expect(parseQuery('https://github.com/sourcegraph/sourcegraph/issues/1234')).toEqual({
            owner: 'sourcegraph',
            repoName: 'sourcegraph',
            number: 1234,
        })
        expect(parseQuery('https://github.com/sourcegraph/sourcegraph/pull/5678')).toEqual({
            owner: 'sourcegraph',
            repoName: 'sourcegraph',
            number: 5678,
        })
        expect(parseQuery('https://ghe.example.com/sourcegraph/sourcegraph/pull/9012')).toEqual({
            owner: 'sourcegraph',
            repoName: 'sourcegraph',
            number: 9012,
        })
    })

    it('should parse non-URL formats correctly', () => {
        expect(parseQuery('github.com/sourcegraph/sourcegraph/issues/3456')).toEqual({
            owner: 'sourcegraph',
            repoName: 'sourcegraph',
            number: 3456,
        })
        expect(parseQuery('ghe.example.com/sourcegraph/sourcegraph/issues/7890')).toEqual({
            owner: 'sourcegraph',
            repoName: 'sourcegraph',
            number: 7890,
        })
        expect(parseQuery('sourcegraph/sourcegraph/issues/2345')).toEqual({
            owner: 'sourcegraph',
            repoName: 'sourcegraph',
            number: 2345,
        })
        expect(parseQuery('sourcegraph/sourcegraph:6789')).toEqual({
            owner: 'sourcegraph',
            repoName: 'sourcegraph',
            number: 6789,
        })
    })

    it('should return null for invalid formats', () => {
        expect(parseQuery('github.com/sourcegraph/sourcegraph')).toBeNull()
        expect(parseQuery('sourcegraph/sourcegraph')).toBeNull()
        expect(parseQuery('sourcegraph/sourcegraph/invalid/1234')).toBeNull()
    })
})
