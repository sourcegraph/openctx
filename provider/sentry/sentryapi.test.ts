import { describe, expect, test, vi } from 'vitest'
import { fetchIssue } from './sentryapi.js'

describe('fetchIssue', () => {
    test('returns issue when API response is successful', async () => {
        const mockIssue = { id: '123', title: 'Test Issue' }
        const mockFetch = vi.fn().mockResolvedValue({
            ok: true,
            json: () => Promise.resolve(mockIssue),
        })
        global.fetch = mockFetch

        const issue = await fetchIssue('token', 'org', '123')

        expect(issue).toEqual(mockIssue)
    })

    test('returns null when API returns 404', async () => {
        const mockFetch = vi.fn().mockResolvedValue({
            ok: false,
            status: 404,
        })
        global.fetch = mockFetch

        const issue = await fetchIssue('token', 'org', '123')

        expect(issue).toBeNull()
    })

    test('throws error when API returns non-404 error', async () => {
        const mockFetch = vi.fn().mockResolvedValue({
            ok: false,
            status: 500,
            statusText: 'Internal Server Error',
        })
        global.fetch = mockFetch

        await expect(fetchIssue('token', 'org', '123')).rejects.toThrowError(
            'Failed to fetch issue 123 from org: 500 Internal Server Error',
        )
    })

    test('aborts request after timeout', async () => {
        const mockFetch = vi
            .fn<[any, RequestInit | undefined], Promise<Response>>()
            .mockImplementation((_, init) => {
                return new Promise((_, reject) => {
                    if (!init?.signal) {
                        throw new Error('invalid request')
                    }
                    init.signal.onabort = () => {
                        reject(new Error('The operation was aborted'))
                    }
                })
            })
        global.fetch = mockFetch

        await expect(fetchIssue('token', 'org', '123', 10)).rejects.toThrowError(
            'The operation was aborted',
        )
    })
})
