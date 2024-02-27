import type { AnnotationsResult, ItemsResult, ProviderSettings } from '@openctx/protocol'
import { describe, expect, test, vi } from 'vitest'
import type { Logger } from '../logger'
import { createProviderClient } from './createProviderClient'

function testdataFileUri(file: string): string {
    return `file://${__dirname}/testdata/${file}`
}

describe('createProviderClient', () => {
    test('items', async () => {
        const pc = createProviderClient(testdataFileUri('provider.js'))
        const settings: ProviderSettings = { myTitle: 'ABC' }
        expect(await pc.items({}, settings)).toStrictEqual<ItemsResult | null>([{ title: 'ABC' }])
    })

    test('annotations', async () => {
        const pc = createProviderClient(testdataFileUri('provider.js'))
        const settings: ProviderSettings = { myTitle: 'ABC' }

        // File URI that satisfies the provider's selector.
        expect(
            await pc.annotations({ uri: 'file:///foo', content: 'A\nB\nC\nD' }, settings)
        ).toStrictEqual<AnnotationsResult | null>([
            {
                uri: 'file:///foo',
                range: { start: { line: 1, character: 2 }, end: { line: 3, character: 4 } },
                item: { title: 'ABC' },
            },
        ])

        // File URI that does NOT satisfy the provider's selector.
        expect(
            await pc.annotations({ uri: 'file:///xxx', content: 'A' }, settings)
        ).toStrictEqual<AnnotationsResult | null>(null)
    })

    describe('error handling', () => {
        test('top-level throw', async () => {
            const logger = vi.fn((() => {}) as Logger)
            const pc = createProviderClient(testdataFileUri('topLevelThrow.js'), { logger })
            await expect(pc.items({}, {})).rejects.toThrow('topLevelThrow')
            expect(logger.mock.lastCall?.[0]).toContain('Error: topLevelThrow')
        })

        test('throw in capabilities', async () => {
            const logger = vi.fn((() => {}) as Logger)
            const pc = createProviderClient(testdataFileUri('capabilitiesThrow.js'), { logger })
            await expect(pc.annotations({ uri: 'file:///f', content: 'A' }, {})).rejects.toThrow(
                'capabilitiesThrow'
            )
            expect(logger.mock.lastCall?.[0]).toContain('Error: capabilitiesThrow')
        })

        test('throw in items', async () => {
            const logger = vi.fn((() => {}) as Logger)
            const pc = createProviderClient(testdataFileUri('methodsThrow.js'), { logger })
            await expect(pc.items({}, {})).rejects.toThrow('itemsThrow')
            expect(logger.mock.lastCall?.[0]).toContain('Error: itemsThrow')
        })

        test('throw in annotations', async () => {
            const logger = vi.fn((() => {}) as Logger)
            const pc = createProviderClient(testdataFileUri('methodsThrow.js'), { logger })
            await expect(pc.annotations({ uri: 'file:///f', content: 'A' }, {})).rejects.toThrow(
                'annotationsThrow'
            )
            expect(logger.mock.lastCall?.[0]).toContain('Error: annotationsThrow')
        })
    })

    test('transport reuse', async () => {
        // We don't want the transport to be recreated each time. Specifically:
        //
        // - For all transports, the client should call `capabilities` once.
        // - For local module file transports, the module should be imported once.

        // Testing hack: communicate with the transportReuse.js module using a global var.
        const info = {
            moduleLoads: 0,
            capabilitiesCalls: 0,
            itemsCalls: 0,
            annotationsCalls: 0,
        }
        ;(global as any).__test__transportReuseInfo = info

        const pc0 = createProviderClient(testdataFileUri('transportReuse.js'), {})
        expect(info.moduleLoads).toBe(0)
        expect(info.capabilitiesCalls).toBe(0)
        expect(info.annotationsCalls).toBe(0)

        await pc0.annotations({ uri: 'file:///f0', content: 'A0' }, {})
        expect(info.moduleLoads).toBe(1)
        expect(info.capabilitiesCalls).toBe(1)
        expect(info.annotationsCalls).toBe(1)

        await pc0.annotations({ uri: 'file:///f1', content: 'A1' }, {})
        expect(info.moduleLoads).toBe(1)
        expect(info.capabilitiesCalls).toBe(1)
        expect(info.annotationsCalls).toBe(2)

        // Now create a new provider client from the same module.
        const pc1 = createProviderClient(testdataFileUri('transportReuse.js'), {})
        expect(info.moduleLoads).toBe(1)
        expect(info.capabilitiesCalls).toBe(1)
        expect(info.annotationsCalls).toBe(2)

        await pc1.annotations({ uri: 'file:///f2', content: 'A2' }, {})
        expect(info.moduleLoads).toBe(1)
        expect(info.capabilitiesCalls).toBe(2)
        expect(info.annotationsCalls).toBe(3)
    })
})
