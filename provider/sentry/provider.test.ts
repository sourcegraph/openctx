import { describe, expect, test, vi } from 'vitest'
import { formatIssueForLLM, parseSentryURL, providerImplementation } from './provider.js'
import type { Issue } from './sentryapi.js'
import * as sentryapi from './sentryapi.js'

describe('parseSentryURL', () => {
    test('returns null for invalid URLs', () => {
        expect(parseSentryURL('invalid')).toBeNull()
        expect(parseSentryURL('https://example.com')).toBeNull()
    })

    test('returns null for URLs without organization ID and issue ID', () => {
        expect(parseSentryURL('https://sentry.io/')).toBeNull()
        expect(parseSentryURL('https://sentry.io/issues/')).toBeNull()
    })

    test('parses valid Sentry URLs correctly', () => {
        expect(parseSentryURL('https://sourcegraph.sentry.io/issues/1234567890/')).toEqual({
            organizationId: 'sourcegraph',
            issueId: '1234567890',
        })
        expect(
            parseSentryURL(
                'https://example.sentry.io/issues/9876543210/?project=1234567&query=is%3Aunresolved+issue.priority%3A%5Bhigh%2C+medium%5D&referrer=issue-stream&statsPeriod=14d&stream_index=0'
            )
        ).toEqual({
            organizationId: 'example',
            issueId: '9876543210',
        })
    })
})

describe('formatIssueForLLM', () => {
    test('formats issue with all available properties', () => {
        const issue = {
            shortId: 'ABC123',
            title: 'Error occurred',
            culprit: 'app/main.js',
            level: 'error',
            status: 'unresolved',
            firstSeen: '2023-05-01T12:00:00Z',
            lastSeen: '2023-05-01T12:30:00Z',
            count: 10,
            permalink: 'https://sentry.io/issues/ABC123',
            logger: 'main',
            metadata: {
                filename: 'app/main.js',
                type: 'TypeError',
                value: "Cannot read property 'foo' of undefined",
            },
        } as any as Issue

        const expected = `Here's some information on Sentry issue: ABC123 that I provided as part of the context:
Title: Error occurred
Culprit: app/main.js
Level: error
Status: unresolved
First Seen: 2023-05-01T12:00:00Z
Last Seen: 2023-05-01T12:30:00Z
Count: 10
Permalink: https://sentry.io/issues/ABC123
Logger: main
Filename: app/main.js
Type: TypeError
Value: Cannot read property 'foo' of undefined`

        expect(formatIssueForLLM(issue)).toBe(expected)
    })

    test('formats issue without metadata', () => {
        const issue = {
            shortId: 'ABC123',
            title: 'Error occurred',
            culprit: 'app/main.js',
            level: 'error',
            status: 'unresolved',
            firstSeen: '2023-05-01T12:00:00Z',
            lastSeen: '2023-05-01T12:30:00Z',
            count: 10,
            permalink: 'https://sentry.io/issues/ABC123',
            logger: 'main',
        } as any as Issue

        const expected = `Here's some information on Sentry issue: ABC123 that I provided as part of the context:
Title: Error occurred
Culprit: app/main.js
Level: error
Status: unresolved
First Seen: 2023-05-01T12:00:00Z
Last Seen: 2023-05-01T12:30:00Z
Count: 10
Permalink: https://sentry.io/issues/ABC123
Logger: main`

        expect(formatIssueForLLM(issue)).toBe(expected)
    })

    test('formats issue with metadata title', () => {
        const issue = {
            shortId: 'ABC123',
            title: 'Error occurred',
            culprit: 'app/main.js',
            level: 'error',
            status: 'unresolved',
            firstSeen: '2023-05-01T12:00:00Z',
            lastSeen: '2023-05-01T12:30:00Z',
            count: 10,
            permalink: 'https://sentry.io/issues/ABC123',
            logger: 'main',
            metadata: {
                title: 'Unexpected error',
            },
        } as any as Issue

        const expected = `Here's some information on Sentry issue: ABC123 that I provided as part of the context:
Title: Error occurred
Culprit: app/main.js
Level: error
Status: unresolved
First Seen: 2023-05-01T12:00:00Z
Last Seen: 2023-05-01T12:30:00Z
Count: 10
Permalink: https://sentry.io/issues/ABC123
Logger: main
Metadata Title: Unexpected error`

        expect(formatIssueForLLM(issue)).toBe(expected)
    })

    test('formats issue without logger', () => {
        const issue = {
            shortId: 'ABC123',
            title: 'Error occurred',
            culprit: 'app/main.js',
            level: 'error',
            status: 'unresolved',
            firstSeen: '2023-05-01T12:00:00Z',
            lastSeen: '2023-05-01T12:30:00Z',
            count: 10,
            permalink: 'https://sentry.io/issues/ABC123',
        } as any as Issue

        const expected = `Here's some information on Sentry issue: ABC123 that I provided as part of the context:
Title: Error occurred
Culprit: app/main.js
Level: error
Status: unresolved
First Seen: 2023-05-01T12:00:00Z
Last Seen: 2023-05-01T12:30:00Z
Count: 10
Permalink: https://sentry.io/issues/ABC123
Logger: N/A`

        expect(formatIssueForLLM(issue)).toBe(expected)
    })
})

describe('provider.meta', () => {
    test('returns expected meta result', async () => {
        const metaResult = providerImplementation.meta()
        expect(metaResult).toEqual({
            name: 'Sentry Issues',
            mentions: {},
            annotations: { selectors: [] },
        })
    })

    test('returns empty selector', async () => {
        const metaResult = providerImplementation.meta()
        expect(metaResult.annotations?.selectors).toHaveLength(0)
    })

    test('returns correct name', async () => {
        const metaResult = providerImplementation.meta()
        expect(metaResult.name).toBe('Sentry Issues')
    })

    test('returns correct features', async () => {
        const metaResult = providerImplementation.meta()
        expect(metaResult.mentions).toEqual({})
    })
})

describe('provider.items', () => {
    test('returns expected items result', async () => {
        const issue = {
            title: 'Title',
            shortId: '123',
            permalink: 'https://sentry.io/issues/123',
        } as any as Issue
        const items = await providerImplementation.items({
            mention: {
                title: 'Sentry issue',
                uri: 'https://sentry.io/issues/123',
                data: {
                    issue,
                },
            },
        })
        expect(items).toEqual([
            {
                title: 'Sentry issue 123',
                ai: { content: formatIssueForLLM(issue) },
                ui: { hover: { text: 'Title' } },
                url: issue.permalink,
            },
        ])
    })

    test('returns empty without issue', async () => {
        const items = await providerImplementation.items({})
        expect(items).toHaveLength(0)
    })
})

describe('provider.mentions', () => {
    test('returns empty array when query is undefined', async () => {
        const params = { query: undefined }
        const settings = {}
        const result = await providerImplementation.mentions(params, settings)
        expect(result).toEqual([])
    })

    test('returns empty array when query is empty string', async () => {
        const params = { query: '' }
        const settings = {}
        const result = await providerImplementation.mentions(params, settings)
        expect(result).toEqual([])
    })

    test('throws error when no access token is provided', async () => {
        const params = { query: 'https://sentry.io/issues/123' }
        const settings = {}
        await expect(providerImplementation.mentions(params, settings)).rejects.toThrow(
            'Must provide a Sentry API token in the `apiToken` settings field, or a path to a file with the token in the `apiTokenPath` settings field.'
        )
    })

    test('returns empty array when input is not a valid Sentry URL', async () => {
        const params = { query: 'invalid' }
        const settings = { apiToken: 'abc123' }
        const result = await providerImplementation.mentions(params, settings)
        expect(result).toEqual([])
    })

    test('returns empty array when issue is not found', async () => {
        const params = { query: 'https://sourcegraph.sentry.io/issues/123' }
        const settings = { apiToken: 'abc123' }

        const fetchIssueMock = vi.spyOn(sentryapi, 'fetchIssue').mockResolvedValue(null)

        const result = await providerImplementation.mentions(params, settings)
        expect(result).toEqual([])
        fetchIssueMock.mockRestore()
    })

    test('returns mention result when issue is found', async () => {
        const params = { query: 'https://sourcegraph.sentry.io/issues/123' }
        const settings = { apiToken: 'abc123' }
        const issue = {
            title: 'Error occurred',
            shortId: '123',
            permalink: 'https://sourcegraph.sentry.io/issues/123',
        } as any as Issue
        const fetchIssueMock = vi.spyOn(sentryapi, 'fetchIssue').mockResolvedValue(issue)
        const result = await providerImplementation.mentions(params, settings)
        expect(result).toEqual([
            {
                title: 'Sentry issue: Error occurred',
                uri: 'https://sourcegraph.sentry.io/issues/123',
                data: { issue },
            },
        ])
        fetchIssueMock.mockRestore()
    })
})
