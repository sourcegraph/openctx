# DevDocs page context provider for OpenCtx

This is a context provider for [OpenCtx](https://openctx.org) that fetches contents from https://devdocs.io/ pages by name for use as context.

## Usage

Add the following to your settings in any OpenCtx client:

```json
"openctx.providers": {
    // ...other providers...
    "https://openctx.org/npm/@openctx/provider-devdocs": {
        "urls": ["https://devdocs.io/go/", "https://devdocs.io/angular~16/"]
    }
},
```

A URL is any top-level documentation URL on https://devdocs.io/. 

## Development

- [Source code](https://sourcegraph.com/github.com/sourcegraph/openctx/-/tree/provider/devdocs)
- [Docs](https://openctx.org/docs/providers/devdocs)
- License: Apache 2.0
