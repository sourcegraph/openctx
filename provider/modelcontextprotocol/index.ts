import { basename } from 'node:path'
import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js'
import {
    CreateMessageRequestSchema,
    ListResourcesResultSchema,
    ProgressNotificationSchema,
    ReadResourceResultSchema,
} from '@modelcontextprotocol/sdk/types.js'
import type {
    Item,
    ItemsParams,
    ItemsResult,
    Mention,
    MentionsParams,
    MentionsResult,
    MetaParams,
    MetaResult,
    Provider,
    ProviderSettings,
} from '@openctx/provider'

async function createClient(
    nodeCommand: string,
    mcpProviderFile: string,
    mcpProviderArgs: string[],
): Promise<Client> {
    const client = new Client(
        {
            name: 'mcp-inspector',
            version: '0.0.1',
        },
        {
            capabilities: {
                experimental: {},
                sampling: {},
                roots: {},
            },
        },
    )
    const transport = new StdioClientTransport({
        command: nodeCommand,
        args: [mcpProviderFile, ...mcpProviderArgs],
    })
    await client.connect(transport)
    console.log('connected to MCP server')

    client.setNotificationHandler(ProgressNotificationSchema, notification => {
        console.log('got MCP notif', notification)
    })

    client.setRequestHandler(CreateMessageRequestSchema, request => {
        console.log('got MCP request', request)
        return { _meta: {} }
    })
    return client
}

class MCPProxy implements Provider {
    private mcpClient?: Promise<Client>

    async meta(_params: MetaParams, settings: ProviderSettings): Promise<MetaResult> {
        const nodeCommand: string = (settings.nodeCommand as string) ?? 'node'
        const mcpProviderUri = settings['mcp.provider.uri'] as string
        if (!mcpProviderUri) {
            this.mcpClient = undefined
            return {
                name: 'undefined MCP provider',
            }
        }
        if (!mcpProviderUri.startsWith('file://')) {
            throw new Error('mcp.provider.uri must be a file:// URI')
        }
        const mcpProviderFile = mcpProviderUri.slice('file://'.length)
        const mcpProviderArgsRaw = settings['mcp.provider.args']
        const mcpProviderArgs = Array.isArray(mcpProviderArgsRaw)
            ? mcpProviderArgsRaw.map(e => `${e}`)
            : []
        this.mcpClient = createClient(nodeCommand, mcpProviderFile, mcpProviderArgs)
        const mcpClient = await this.mcpClient
        const serverInfo = mcpClient.getServerVersion()
        const name = serverInfo?.name ?? basename(mcpProviderFile)
        return {
            name,
            mentions: {
                label: name,
            },
        }
    }

    async mentions?(params: MentionsParams, _settings: ProviderSettings): Promise<MentionsResult> {
        if (!this.mcpClient) {
            return []
        }
        const mcpClient = await this.mcpClient
        const resourcesResp = await mcpClient.request(
            {
                method: 'resources/list',
                params: {},
            },
            ListResourcesResultSchema,
        )

        const { resources } = resourcesResp
        const mentions: Mention[] = []
        for (const resource of resources) {
            const r = {
                uri: resource.uri,
                title: resource.name,
                description: resource.description,
            }
            mentions.push(r)
        }

        const query = params.query?.trim().toLowerCase()
        if (!query) {
            return mentions
        }
        const prefixMatches: Mention[] = []
        const substringMatches: Mention[] = []

        for (const mention of mentions) {
            const title = mention.title.toLowerCase()
            if (title.startsWith(query)) {
                prefixMatches.push(mention)
            } else if (title.includes(query)) {
                substringMatches.push(mention)
            }
        }

        return [...prefixMatches, ...substringMatches]
    }

    async items?(params: ItemsParams, _settings: ProviderSettings): Promise<ItemsResult> {
        if (!params.mention || !this.mcpClient) {
            return []
        }
        const mcpClient = await this.mcpClient
        const response = await mcpClient.request(
            {
                method: 'resources/read' as const,
                params: { uri: params.mention.uri },
            },
            ReadResourceResultSchema,
        )

        const { contents } = response

        const items: Item[] = []
        for (const content of contents) {
            if (content.text) {
                items.push({
                    title: content.uri,
                    ai: {
                        content: (content.text as string) ?? '',
                    },
                })
            } else {
                console.log('No text field was present, mimeType was', content.mimeType)
            }
        }
        return items
    }

    dispose?(): void {
        if (this.mcpClient) {
            this.mcpClient.then(c => {
                c.close()
            })
        }
    }
}

const proxy = new MCPProxy()
export default proxy
