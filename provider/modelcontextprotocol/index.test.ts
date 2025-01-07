import { describe, expect, test, vi } from 'vitest'
import type { MetaParams, ProviderSettings } from '@openctx/provider'
import proxy from './index.js'

vi.mock('@modelcontextprotocol/sdk/client/index.js', () => ({
    Client: vi.fn().mockImplementation(() => ({
        connect: vi.fn(),
        getServerVersion: vi.fn().mockReturnValue({ name: 'Test MCP Server' }),
        request: vi.fn().mockImplementation(async (req) => {
            if (req.method === 'resources/list') {
                return { resources: [
                    { uri: 'test://resource', name: 'Test Resource', description: 'Test Description' }
                ]}
            }
            if (req.method === 'resources/read') {
                return { contents: [
                    { uri: 'test://resource', text: 'Test Content', mimeType: 'text/plain' }
                ]}
            }
        }),
        setNotificationHandler: vi.fn(),
        setRequestHandler: vi.fn(),
        close: vi.fn()
    }))
}))

vi.mock('@modelcontextprotocol/sdk/client/stdio.js', () => ({
    StdioClientTransport: vi.fn()
}))

describe('MCP Provider', () => {
    const settings: ProviderSettings = {
        'mcp.provider.uri': 'file:///path/to/your/mcp/provider.js',
        'nodeCommand': 'node',
        'mcp.provider.args': ['--some-arg', 'value']
    }

    test('meta returns provider info', async () => {
        const result = await proxy.meta({} as MetaParams, settings)
        expect(result).toMatchObject({
            name: expect.any(String),
            mentions: {
                label: expect.any(String)
            }
        })
    })

    test('mentions returns resources', async () => {
        const result = await proxy.mentions?.({
            query: 'test'
        }, settings)
        
        expect(result).toBeDefined()
        expect(Array.isArray(result)).toBe(true)
    })

    test('items returns content', async () => {
        const result = await proxy.items?.({
            mention: {
                uri: 'test://resource',
                title: 'Test Resource'
            }
        }, settings)

        expect(result).toBeDefined()
        expect(Array.isArray(result)).toBe(true)
    })
})