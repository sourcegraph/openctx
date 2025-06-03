/**
 * Core functions for Context7 OpenCtx Provider
 */

import type { ParsedQuery, SearchResult } from './types.js'
import { PATTERNS } from './types.js'

/**
 * Parse user input into repository query, topic keyword, and page numbers
 * @param query - Input in the form "<library query> [page numbers or topic]"
 * @returns Parsed result
 * @throws Error - If the input format is invalid
 */
export function parseInputQuery(query: string): ParsedQuery {
    const trimmed = query.trim()
    if (!trimmed) {
        throw new Error('Repository query is required')
    }

    const parts = trimmed.split(/\s+/)
    const repositoryQuery = parts[0].toLowerCase()
    const remainingParts = parts.slice(1).join(' ')

    let topicKeyword: string | undefined = undefined
    let pageNumbers: number[] | undefined = undefined

    if (remainingParts) {
        // Check if it starts with page numbers pattern
        const words = remainingParts.split(/\s+/)
        const firstWord = words[0]

        if (PATTERNS.PAGE_NUMBERS.test(firstWord)) {
            const numbers = firstWord.split('/').map(num => Number.parseInt(num, 10))
            if (numbers.every(num => Number.isInteger(num) && num > 0)) {
                pageNumbers = numbers
                // Rest is topic keyword
                if (words.length > 1) {
                    topicKeyword = words.slice(1).join(' ')
                }
            } else {
                topicKeyword = remainingParts
            }
        } else {
            topicKeyword = remainingParts
        }
    }

    return { repositoryQuery, topicKeyword, pageNumbers }
}

/**
 * Generate navigation content for AI
 * @param libraries - Array of library search results
 * @param repositoryQuery - The search query used
 * @param maxMentionItems - Maximum number of libraries that can be selected
 * @returns Markdown text for navigation
 */
export function generateNavigation(
    libraries: SearchResult[],
    repositoryQuery: string,
    maxMentionItems: number
): string {
    if (libraries.length === 0) {
        return `No libraries found for "${repositoryQuery}".`
    }

    const libraryList = libraries
        .map((lib, index) => {
            return `### ${index + 1}. ${lib.title}
- **ID**: ${lib.id}
- **Description**: ${lib.description || 'No description'}
- **Tokens**: ${lib.totalTokens.toLocaleString()}
- **Total Snippets**: ${lib.totalSnippets}
- **Stars**: ${lib.stars}`
        })
        .join('\n\n')

    return `Context7 library search results for "${repositoryQuery}".

## How to Access Specific Libraries
- Multiple libraries: @context7 ${repositoryQuery} 1/3/5 (maximum ${maxMentionItems} libraries per request)
- Single library: @context7 ${repositoryQuery} 2
- With topic filter: @context7 ${repositoryQuery} 1/3 authentication

## Selection Method
Based on your needs, choose up to ${maxMentionItems} most relevant libraries from the list below.

## Available Libraries

${libraryList}`
}

/**
 * Filter libraries by page numbers
 * @param libraries - Array of libraries to filter
 * @param pageNumbers - Array of page numbers (1-based)
 * @returns Filtered array of libraries in the order of specified page numbers
 */
export function filterLibrariesByPageNumbers(
    libraries: SearchResult[],
    pageNumbers: number[]
): SearchResult[] {
    const result: SearchResult[] = []

    for (const pageNum of pageNumbers) {
        // Convert to 0-based index and check bounds
        const index = pageNum - 1
        if (index >= 0 && index < libraries.length) {
            result.push(libraries[index])
        }
    }

    return result
}

/**
 * Validate settings
 * @param settings - Settings object to validate
 * @throws Error if required settings are missing
 */
export function validateSettings(settings: unknown): void {
    if (!settings || typeof settings !== 'object') {
        throw new Error('Settings must be an object')
    }

    const settingsObj = settings as Record<string, unknown>
    const missingKeys = ['tokens'].filter(key => !(key in settingsObj))
    if (missingKeys.length > 0) {
        throw new Error(`Missing settings: ${JSON.stringify(missingKeys)}`)
    }
}
