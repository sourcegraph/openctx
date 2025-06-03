import { describe, expect, it } from 'vitest'
import {
    filterLibrariesByPageNumbers,
    generateNavigation,
    parseInputQuery,
    validateSettings,
} from './core.js'
import type { SearchResult } from './types.js'

describe('core.ts', () => {
    describe('parseInputQuery', () => {
        it('throws error for empty query', () => {
            expect(() => parseInputQuery('')).toThrow('Repository query is required')
            expect(() => parseInputQuery('  ')).toThrow('Repository query is required')
        })

        it('parses simple library query', () => {
            const result = parseInputQuery('react')
            expect(result).toEqual({
                repositoryQuery: 'react',
                topicKeyword: undefined,
                pageNumbers: undefined,
            })
        })

        it('converts repository query to lowercase', () => {
            const result = parseInputQuery('React')
            expect(result).toEqual({
                repositoryQuery: 'react',
                topicKeyword: undefined,
                pageNumbers: undefined,
            })
        })

        it('parses query with topic keyword', () => {
            const result = parseInputQuery('react hooks')
            expect(result).toEqual({
                repositoryQuery: 'react',
                topicKeyword: 'hooks',
                pageNumbers: undefined,
            })
        })

        it('parses query with multiple topic keywords', () => {
            const result = parseInputQuery('react custom hooks tutorial')
            expect(result).toEqual({
                repositoryQuery: 'react',
                topicKeyword: 'custom hooks tutorial',
                pageNumbers: undefined,
            })
        })

        it('parses query with single page number', () => {
            const result = parseInputQuery('react 1')
            expect(result).toEqual({
                repositoryQuery: 'react',
                topicKeyword: undefined,
                pageNumbers: [1],
            })
        })

        it('parses query with multiple page numbers', () => {
            const result = parseInputQuery('react 1/3/5')
            expect(result).toEqual({
                repositoryQuery: 'react',
                topicKeyword: undefined,
                pageNumbers: [1, 3, 5],
            })
        })

        it('parses query with page numbers and topic', () => {
            const result = parseInputQuery('react 1/3 hooks')
            expect(result).toEqual({
                repositoryQuery: 'react',
                topicKeyword: 'hooks',
                pageNumbers: [1, 3],
            })
        })

        it('treats invalid page numbers as topic', () => {
            const result = parseInputQuery('react 0/5')
            expect(result).toEqual({
                repositoryQuery: 'react',
                topicKeyword: '0/5',
                pageNumbers: undefined,
            })
        })
    })

    describe('generateNavigation', () => {
        const mockLibraries: SearchResult[] = [
            {
                id: 'react/react',
                title: 'React',
                description: 'A JavaScript library for building user interfaces',
                branch: 'main',
                lastUpdate: '2024-01-01',
                state: 'finalized',
                totalTokens: 50000,
                totalSnippets: 100,
                totalPages: 50,
                stars: 210000,
                trustScore: 95,
            },
            {
                id: 'facebook/react-native',
                title: 'React Native',
                description: undefined,
                branch: 'main',
                lastUpdate: '2024-01-02',
                state: 'finalized',
                totalTokens: 80000,
                totalSnippets: 200,
                totalPages: 80,
                stars: 110000,
                trustScore: 90,
            },
        ]

        it('returns empty message when no libraries found', () => {
            const result = generateNavigation([], 'react', 3)
            expect(result).toBe('No libraries found for "react".')
        })

        it('generates navigation with library details', () => {
            const result = generateNavigation(mockLibraries, 'react', 3)
            
            expect(result).toContain('Context7 library search results for "react"')
            expect(result).toContain('### 1. React')
            expect(result).toContain('- **ID**: react/react')
            expect(result).toContain('- **Description**: A JavaScript library for building user interfaces')
            expect(result).toContain('- **Tokens**: 50,000')
            expect(result).toContain('- **Trust Score**: 95')
            expect(result).toContain('- **Stars**: 210000')
            expect(result).toContain('- **Last Update**: 2024-01-01')
            
            expect(result).toContain('### 2. React Native')
            expect(result).toContain('- **Description**: No description')
        })

        it('includes access instructions', () => {
            const result = generateNavigation(mockLibraries, 'react', 5)
            
            expect(result).toContain('@context7 react 1/3/5 (maximum 5 libraries per request)')
            expect(result).toContain('@context7 react 2')
            expect(result).toContain('@context7 react 1/3 authentication')
        })
    })

    describe('filterLibrariesByPageNumbers', () => {
        const mockLibraries: SearchResult[] = [
            {
                id: 'lib1',
                title: 'Library 1',
                description: 'First library',
                branch: 'main',
                lastUpdate: '2024-01-01',
                state: 'finalized',
                totalTokens: 1000,
                totalSnippets: 10,
                totalPages: 5,
                stars: 100,
                trustScore: 80,
            },
            {
                id: 'lib2',
                title: 'Library 2',
                description: 'Second library',
                branch: 'main',
                lastUpdate: '2024-01-02',
                state: 'finalized',
                totalTokens: 2000,
                totalSnippets: 20,
                totalPages: 10,
                stars: 200,
                trustScore: 85,
            },
            {
                id: 'lib3',
                title: 'Library 3',
                description: 'Third library',
                branch: 'main',
                lastUpdate: '2024-01-03',
                state: 'finalized',
                totalTokens: 3000,
                totalSnippets: 30,
                totalPages: 15,
                stars: 300,
                trustScore: 90,
            },
        ]

        it('returns empty array for empty page numbers', () => {
            const result = filterLibrariesByPageNumbers(mockLibraries, [])
            expect(result).toEqual([])
        })

        it('returns single library by page number', () => {
            const result = filterLibrariesByPageNumbers(mockLibraries, [2])
            expect(result).toHaveLength(1)
            expect(result[0].id).toBe('lib2')
        })

        it('returns multiple libraries in order', () => {
            const result = filterLibrariesByPageNumbers(mockLibraries, [3, 1, 2])
            expect(result).toHaveLength(3)
            expect(result[0].id).toBe('lib3')
            expect(result[1].id).toBe('lib1')
            expect(result[2].id).toBe('lib2')
        })

        it('filters out invalid page numbers', () => {
            const result = filterLibrariesByPageNumbers(mockLibraries, [0, 1, 4, 5])
            expect(result).toHaveLength(1)
            expect(result[0].id).toBe('lib1')
        })

        it('handles duplicate page numbers', () => {
            const result = filterLibrariesByPageNumbers(mockLibraries, [1, 1, 2])
            expect(result).toHaveLength(3)
            expect(result[0].id).toBe('lib1')
            expect(result[1].id).toBe('lib1')
            expect(result[2].id).toBe('lib2')
        })
    })

    describe('validateSettings', () => {
        it('throws error for non-object settings', () => {
            expect(() => validateSettings(null)).toThrow('Settings must be an object')
            expect(() => validateSettings(undefined)).toThrow('Settings must be an object')
            expect(() => validateSettings('string')).toThrow('Settings must be an object')
            expect(() => validateSettings(123)).toThrow('Settings must be an object')
        })

        it('throws error when tokens is missing', () => {
            expect(() => validateSettings({})).toThrow('Missing settings: ["tokens"]')
            expect(() => validateSettings({ mentionLimit: 3 })).toThrow('Missing settings: ["tokens"]')
        })

        it('does not throw when tokens is present', () => {
            expect(() => validateSettings({ tokens: 6000 })).not.toThrow()
            expect(() => validateSettings({ tokens: 6000, mentionLimit: 3 })).not.toThrow()
        })

        it('does not throw for additional properties', () => {
            expect(() => validateSettings({ tokens: 6000, extra: 'value' })).not.toThrow()
        })
    })
})