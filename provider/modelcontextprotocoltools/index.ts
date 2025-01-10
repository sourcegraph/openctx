import { basename } from 'node:path'
import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js'
import {
    CallToolResultSchema,
    
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
const Ajv = require('ajv')

async function createClient(
    nodeCommand: string,
    mcpProviderFile: string,
    mcpProviderArgs: string[],
): Promise<Client> {
    const client = new Client(
        {
            name: 'mcp-tool',
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
    return client
}

class MCPToolsProxy implements Provider {
    private mcpClient?: Promise<Client>
    private toolSchemas: Map<string, any> = new Map()
    private ajv = new Ajv()

    // Gets the Metadata for the MCP Tools Provider
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

    // Gets Lists All the tools available in the MCP Provider along with their schemas
    async mentions?(params: MentionsParams, _settings: ProviderSettings): Promise<MentionsResult> {
        if (!this.mcpClient) {
            return []
        }
        const mcpClient = await this.mcpClient
        const toolsResp = await mcpClient.listTools()

        const { tools } = toolsResp
        const mentions: Mention[] = []
        for (const tool of tools) {
            // Store the schema in the Map using tool name as key
            this.toolSchemas.set(tool.name, JSON.stringify(tool.inputSchema))
            
            const r = {
                uri: tool.uri,
                title: tool.name,
                description: tool.description,
                data: (tool.inputSchema),
            } as Mention
            mentions.push(r)
        }

        const query = params.query?.trim().toLowerCase()
        if (!query) {
            return mentions
        }
        const prefixMatches: Mention[] = []
        const substringMatches: Mention[] = []

        // Filters the tools based on the query
        for (const mention of mentions) {
            const title = mention.title.toLowerCase()
            if (title.startsWith(query)) {
                prefixMatches.push(mention)
            } else if (title.includes(query)) {
                substringMatches.push(mention)
            }
        }

        // Combines the prefix and substring matches
        return [...prefixMatches, ...substringMatches]
    }

    // Retrieves the schema for a tool from the Map using the tool name as key
    getToolSchema(toolName: string): any {
        return JSON.parse(this.toolSchemas.get(toolName) as string)
    }

    // Calls the tool with the provided input and returns the result
    async items?(params: ItemsParams, _settings: ProviderSettings): Promise<ItemsResult> {
        if (!this.mcpClient) {
            return []
        }
        const mcpClient = await this.mcpClient

        const toolName = params.mention?.title
        const toolInput = params.mention?.data

        // Validates the tool input against the stored schema
        if (toolName && toolInput) {
            const schema = this.getToolSchema(toolName)
            if (schema) {
                const isValid = this.ajv.validate(schema, toolInput)
                if (!isValid) {
                    console.error('Invalid tool input:', this.ajv.errors)
                    throw new Error(`Invalid input for tool ${toolName}: ${JSON.stringify(this.ajv.errors)}`)
                }
            }
        }

        // Calls the tool with the provided input
        const response = await mcpClient.request(
            {
                method: 'tools/call' as const,
                params: { 
                    name: toolName,
                    arguments: toolInput 
                },
            },
            CallToolResultSchema,
        )
        
        const contents = response.content
        const items: Item[] = []
        for (const content of contents) {
            if (content.text) {
                items.push({
                    title: (toolName as string) ?? '',
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


const proxy = new MCPToolsProxy()
export default proxy
