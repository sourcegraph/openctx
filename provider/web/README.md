# Web page context provider for OpenCtx

This is a context provider for [OpenCtx](https://openctx.org) that fetches contents from web pages by URL for use as context.

## Usage

Add the following to your settings in any OpenCtx client:

```json
"openctx.providers": {
    // ...other providers...
    "https://openctx.org/npm/@openctx/web": true
},
```

Then use the `@`-mention type **Web URLs** and enter a URL, such as `https://example.com`, to include the web page's contents as context.

## Development

- [Source code](https://sourcegraph.com/github.com/sourcegraph/openctx/-/tree/provider/web)
- [Docs](https://openctx.org/docs/providers/web)
- License: Apache 2.0
