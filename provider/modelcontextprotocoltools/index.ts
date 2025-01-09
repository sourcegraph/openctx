import { basename } from 'node:path'
import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js'
import {
    CreateMessageRequestSchema,
    ProgressNotificationSchema,
    CallToolResultSchema,
    
} from '@modelcontextprotocol/sdk/types.js'
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import Ajv from 'ajv';
import { createServer } from "./everything.js";
import type {
    Item,
    ItemsParams,
    ItemsResult,
    Mention,
    MentionsParams,
    MentionsResult,
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

    client.setNotificationHandler(ProgressNotificationSchema, notification => {
        console.log('got MCP notif', notification)
    })

    client.setRequestHandler(CreateMessageRequestSchema, request => {
        console.log('got MCP request', request)
        return { _meta: {} }
    })
    return client
}

class MCPToolsProxy implements Provider {
    private mcpClient?: Promise<Client>
    private toolSchemas: Map<string, any> = new Map() // Add this line to store schemas

    async meta(settings: ProviderSettings): Promise<MetaResult> {
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
                inputSchema: JSON.stringify(tool.inputSchema),
            } as Mention
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
        // Add a method to get the stored schema
        getToolSchema(toolName: string): any {
            return this.toolSchemas.get(toolName)
        }

    async items?(params: ItemsParams, _settings: ProviderSettings): Promise<ItemsResult> {
        if (!this.mcpClient) {
            return []
        }
        const mcpClient = await this.mcpClient

        // Get the tool name and validate its input
        const toolName = params.mention?.title
        const toolInput = params.mention?.data

        if (toolName && toolInput) {
            // Get the stored schema for this tool
            const schema = JSON.parse(this.toolSchemas.get(toolName) as string)
            console.log("we have the schema", schema)
            if (schema) {
                // Validate the input against the schema
                const Ajv = require("ajv");
                const ajv = new Ajv()
                const isValid = ajv.validate(schema, toolInput)
                
                if (!isValid) {
                    console.error('Invalid tool input:', ajv.errors)
                    throw new Error(`Invalid input for tool ${toolName}: ${JSON.stringify(ajv.errors)}`)
                }
            }
        }

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
                    title: (content.uri as string) ?? '',
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

async function main() {
  const transport = new StdioServerTransport();
  const { server, cleanup } = createServer();

  await server.connect(transport);

  // Cleanup on exit
  process.on("SIGINT", async () => {
    await cleanup();
    await server.close();
    process.exit(0);
  });
}

main().catch((error) => {
    console.error("Server error:", error);
    process.exit(1);
  });
  

const proxy = new MCPToolsProxy()
export default proxy
