import { afterEach } from 'node:test'
import type { MetaResult, ResponseMessage } from '@openctx/protocol'
import { afterAll, beforeAll, describe, expect, test, vi } from 'vitest'
import createFetchMock from 'vitest-fetch-mock'
import { type ProviderTransport, createTransport } from './createTransport.js'

async function expectProviderTransport(provider: ProviderTransport) {
    expect(await provider.meta({}, {})).toEqual<MetaResult>({
        selector: [{ path: 'foo' }],
        name: 'foo',
    })
}

function testdataFileUri(file: string): string {
    return `file://${__dirname}/testdata/${file}`
}

describe('createTransport', () => {
    const fetchMocker = createFetchMock(vi)
    beforeAll(() => fetchMocker.enableMocks())
    afterEach(() => fetchMocker.resetMocks())
    afterAll(() => fetchMocker.disableMocks())

    describe('module file', () => {
        test('ESM .mjs', () =>
            expectProviderTransport(createTransport(testdataFileUri('esmExtProvider.mjs'), {})))

        test('ESM .js', () =>
            expectProviderTransport(createTransport(testdataFileUri('esmProvider.js'), {})))

        test('ESM .ts', () =>
            expectProviderTransport(createTransport(testdataFileUri('esmProvider.ts'), {})))

        test('CommonJS .cjs', () =>
            expectProviderTransport(createTransport(testdataFileUri('commonjsExtProvider.cjs'), {})))

        test('CommonJS .js', () =>
            expectProviderTransport(createTransport(testdataFileUri('commonjsProvider.js'), {})))

        test('not found', async () => {
            const provider = createTransport('file:///doesnotexist', {})
            await expect(() => provider.meta({}, {})).rejects.toThrow(/Failed to load/)
        })

        test('providerBaseUri', () =>
            expectProviderTransport(
                createTransport('esmProvider.js', { providerBaseUri: testdataFileUri('') })
            ))
    })

    describe('HTTP endpoint (integration)', () => {
        const fetchMocker = createFetchMock(vi)
        beforeAll(() => fetchMocker.enableMocks())
        afterEach(() => fetchMocker.resetMocks())
        afterAll(() => fetchMocker.disableMocks())

        test('simple', async () => {
            fetchMocker.mockOnce(
                JSON.stringify({
                    result: {
                        selector: [{ path: 'foo' }],
                        name: 'foo',
                    } satisfies MetaResult,
                } satisfies ResponseMessage)
            )
            const provider = createTransport('https://example.com/openctx', {})
            await expectProviderTransport(provider)
        })

        describe('errors', () => {
            test('HTTP request error', async () => {
                fetchMocker.mockRejectOnce(new Error('network error'))
                const provider = createTransport('https://example.com/openctx', {})
                await expect(provider.meta({}, {})).rejects.toThrow(/network error/)
            })

            test('HTTP error 404', async () => {
                fetchMocker.mockResponseOnce('', { status: 404 })
                const provider = createTransport('https://example.com/openctx', {})
                await expect(provider.meta({}, {})).rejects.toThrow(/404/)
            })
        })
    })
})
