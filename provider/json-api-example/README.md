# JSON API Example Provider for OpenCtx

[OpenCtx](https://openctx.org) context provider example that calls a JSON API to fetch context.

## Usage

```json
"openctx.providers": {
    // ...other providers...
    "https://openctx.org/npm/@openctx/provider-json-api-example": true
},
```

## Mention support

- Vehicle list
- Vehicle search

## Context included

- Vehicle data, with films the vehicle featured in

## Development

- [Source code](https://sourcegraph.com/github.com/sourcegraph/openctx/-/tree/provider/json-api-example)
- [Docs](https://openctx.org/docs/providers/json-api-example)
- License: Apache 2.0

### Local Testing

1. Clone the repo
1. `pnpm install`
1. `pnpm -C provider/json-api-example bundle --watch` to automatically recompile on changes
1. Run `echo file://$(pwd)/provider/json-api-example/dist/bundle.js` and use that URL in your OpenCtx instead of `"https://openctx.org/npm/@openctx/provider-json-api-example"`
1. Reload your OpenCtx client
