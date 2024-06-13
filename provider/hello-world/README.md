# Hello World context provider for OpenCtx

This is a sample context provider for [OpenCtx](https://openctx.org) that annotates every file with `✨ Hello, world!` every 10 lines or so.

## Usage

Add the following to your settings in any OpenCtx client:

```json
"openctx.providers": {
    // ...other providers...
    "https://openctx.org/npm/@openctx/provider-hello-world": true
},
```

## Configuration

This sample provider is not configurable.

## Development

- [Source code](https://sourcegraph.com/github.com/sourcegraph/openctx/-/tree/provider/hello-world)
- [Docs](https://openctx.org/docs/providers/hello-world)
- License: Apache 2.0

### Local Testing

1. Clone the repo
1. `pnpm install`
1. `pnpm -C provider/hello-world bundle --watch` to automatically recompile on changes
1. Run `echo file://$(pwd)/provider/hello-world/dist/bundle.js` and use that URL in your OpenCtx instead of `"https://openctx.org/npm/@openctx/provider-hello-world"`
1. Reload your OpenCtx client
