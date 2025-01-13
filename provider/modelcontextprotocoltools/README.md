# MCP Tools Provider for OpenCtx (Work in Progress)

This is a context provider for [OpenCtx](https://openctx.org) that enables access to tools exposed by [MCP](https://modelcontextprotocol.io) providers. This provider specifically handles tool interactions - it does not support MCP resources.

Currently, only MCP over stdio is supported (HTTP is not yet supported).

## What This Provider Does
- Connects to MCP providers to expose their available tools
- Validates tool inputs against their schemas
- Executes tool calls and returns results
- Supports tool discovery and filtering via mentions

## Creating MCP Tools

To create tools that can be used with this provider, see the [MCP documentation](https://modelcontextprotocol.io) on implementing tool endpoints in your MCP server.

> Note: This provider documentation is under active development. Additional documentation and features examples will be added once design decisions are finalized.
