# Sourcegraph Search context provider for OpenCtx

This is a context provider for [OpenCtx](https://openctx.org) that provides Sourcegraph search results as context via the mention and items APIs.

## Usage

Add the following to your settings in any OpenCtx client:

```json
"openctx.providers": {
    // ...other providers...
    "https://openctx.org/npm/@openctx/provider-sourcegraph-search": true
},
```

## Configuration

This sample provider is not configurable.

## Development

- [Source code](https://sourcegraph.com/github.com/sourcegraph/openctx/-/tree/provider/sourcegraph-search)
- [Docs](https://openctx.org/docs/providers/sourcegraph-search)
- License: Apache 2.0
