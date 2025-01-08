import { describe, expect, test } from 'vitest'
import type { MetaParams, ProviderSettings } from '@openctx/provider'
import proxy from './index.js'

// vi.mock('@modelcontextprotocol/sdk/client/index.js', () => ({
//     Client: vi.fn().mockImplementation(() => ({
//         connect: vi.fn(),
//         getServerVersion: vi.fn().mockReturnValue({ name: 'Test MCP Server' }),
//         request: vi.fn().mockImplementation(async (req) => {
//             if (req.method === 'resources/list') {
//                 return { resources: [
//                     { uri: 'test://resource', name: 'Test Resource', description: 'Test Description' }
//                 ]}
//             }
//             if (req.method === 'resources/read') {
//                 return { contents: [
//                     { uri: 'test://resource', text: 'Test Content', mimeType: 'text/plain' }
//                 ]}
//             }
//         }),
//         setNotificationHandler: vi.fn(),
//         setRequestHandler: vi.fn(),
//         close: vi.fn()
//     }))
// }))

describe('MCP Provider', () => {
    const settings: ProviderSettings = {
        'mcp.provider.uri': 'file:///Users/arafatkhan/Desktop/servers/src/everything/dist/index.js',
        'nodeCommand': 'node',
        'mcp.provider.args': []
    }


    test('meta returns provider info', async () => {
        const result = await proxy.meta({} as MetaParams, settings)


        // console.log('result', result)
        expect(result).toMatchObject({
            name: expect.any(String),
            mentions: {
                label: expect.any(String)
            }
        })
    })


    test('MCP Provider > mentions returns resources', async () => {
        if (proxy.mentions) {
            const result = await proxy.mentions({ query: '' }, {} as ProviderSettings)
        
            // console.log('result', result)
        
            expect(result).toEqual(
                expect.arrayContaining([
                    expect.any(Object)
                ])
            )
        } else {
            throw new Error('mentions method is not defined on proxy')
        }
    })

    test('MCP Provider > mentions filters resources', async () => {
        if (proxy.mentions) {
            const result = await proxy.mentions({ query: 'rce 1' }, {} as ProviderSettings)
        
            // console.log('result', result)
        
            expect(result).toEqual(
                expect.arrayContaining([
                    expect.any(Object)
                ])
            )
        } else {
            throw new Error('mentions method is not defined on proxy')
        }
    })

    test('MCP Provider > mentions filters runny', async () => {
        if (proxy.items) {
            const result = await proxy.items({ mention: { uri: 'test://static/resource/1', title: 'Resource 1' } }, {} as ProviderSettings)
        
            console.log('result', result)
        
            expect(result).toEqual(
                expect.arrayContaining([
                    expect.any(Object)
                ])
            )
        } else {
            throw new Error('mentions method is not defined on proxy')
        }
    })

    // test('mentions returns resources', async () => {
    //     const result = await proxy.mentions?.({
    //         query: 'test'
    //     }, settings)
    //     console.log('final result', result)
    //     expect(result).toBeDefined()
    //     expect(Array.isArray(result)).toBe(true)
    // })

    // test('items returns content', async () => {
    //     const result = await proxy.items?.({
    //         mention: {
    //             uri: 'test://resource',
    //             title: 'Test Resource'
    //         }
    //     }, settings)

    //     expect(result).toBeDefined()
    //     expect(Array.isArray(result)).toBe(true)
    // })
})