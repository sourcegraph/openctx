# MCP proxy for OpenCtx

This is a context provider for [OpenCtx](https://openctx.org) that fetches contents from a [MCP](https://modelcontextprotocol.io) provider for use as context.

Currently, only MCP over stdio is supported (HTTP is not yet supported).

## Development

1. Clone the [modelcontextprotocol/servers](https://github.com/modelcontextprotocol/servers) repository. Follow the instructions there to build the example providers. This should generate output files of the form `build/${example_name}/index.js`.
1. Run `pnpm watch` in this directory.
1. Add the following to your VS Code settings:
    ```json
    "openctx.providers": {
        // ...other providers...
        "https://openctx.org/npm/@openctx/provider-modelcontextprotocol": {
            "nodeCommand": "node",
            "mcp.provider.uri": "file:///path/to/servers/root/build/everything/index.js",
        }
    }
    ```
1. Reload the VS Code window. You should see `servers/everything` in the `@`-mention dropdown.

To hook up to the Postgres MCP provider, use:

```json
"openctx.providers": {
    // ...other providers...
    "https://openctx.org/npm/@openctx/provider-modelcontextprotocol": {
        "nodeCommand": "node",
        "mcp.provider.uri": "file:///path/to/servers/root/build/postgres/index.js",
        "mcp.provider.args": [
            "postgresql://sourcegraph:sourcegraph@localhost:5432/sourcegraph"
        ]
    }
}
```

## More MCP Servers

The following MCP servers are available in the [modelcontextprotocol/servers](https://github.com/modelcontextprotocol/servers) repository:

- [Brave Search](https://github.com/modelcontextprotocol/servers/tree/main/src/brave-search) - Search the Brave search API
- [Postgres](https://github.com/modelcontextprotocol/servers/tree/main/src/postgres) - Connect to your Postgres databases to query schema information and write optimized SQL
- [Filesystem](https://github.com/modelcontextprotocol/servers/tree/main/src/filesystem) - Access files on your local machine
- [Everything](https://github.com/modelcontextprotocol/servers/tree/main/src/everything) - A demo server showing MCP capabilities
- [Google Drive](https://github.com/modelcontextprotocol/servers/tree/main/src/gdrive) - Search and access your Google Drive documents
- [Google Maps](https://github.com/modelcontextprotocol/servers/tree/main/src/google-maps) - Get directions and information about places
- [Memo](https://github.com/modelcontextprotocol/servers/tree/main/src/memo) - Access your Memo notes
- [Git](https://github.com/modelcontextprotocol/servers/tree/main/src/git) - Get git history and commit information
- [Puppeteer](https://github.com/modelcontextprotocol/servers/tree/main/src/puppeteer) - Control headless Chrome for web automation
- [SQLite](https://github.com/modelcontextprotocol/servers/tree/main/src/sqlite) - Query SQLite databases

## Creating your own MCP server

See the [MCP docs](https://modelcontextprotocol.io) for how to create your own MCP servers.