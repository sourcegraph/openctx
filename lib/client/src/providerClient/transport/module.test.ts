import { afterAll, afterEach, beforeAll, describe, expect, test, vi } from 'vitest'
import createFetchMock from 'vitest-fetch-mock'
import { fetchProviderSource } from './module.js'

describe('fetchProviderSource', () => {
    const fetchMocker = createFetchMock(vi)
    beforeAll(() => fetchMocker.enableMocks())
    afterEach(() => fetchMocker.resetMocks())
    afterAll(() => fetchMocker.disableMocks())

    test('ok', async () => {
        fetchMocker.mockResponseOnce('abc', {
            status: 200,
            headers: { 'Content-Type': 'application/javascript' },
        })
        expect(await fetchProviderSource('https://example.com/a.js')).toEqual('abc')
    })

    test('bad Content-Type', async () => {
        fetchMocker.mockResponseOnce('', {
            status: 200,
            headers: { 'Content-Type': 'text/html' },
        })

        await expect(fetchProviderSource('https://example.com/a.js')).rejects.toThrow(
            /invalid Content-Type/
        )
    })

    test('HTTP error 404', async () => {
        fetchMocker.mockResponseOnce('', { status: 404 })
        await expect(fetchProviderSource('https://example.com/a.js')).rejects.toThrow(/404/)
    })
})
