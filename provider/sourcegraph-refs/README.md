# Sourcegraph refs context provider for OpenCtx

This is a context provider for [OpenCtx](https://openctx.org) that fetches Sourcegraph references for use as context.

## Usage

Add the following to your settings in any OpenCtx client:

```json
"openctx.providers": {
    // ...other providers...
    "https://openctx.org/npm/@openctx/provider-sourcegraph-refs": {
        "sourcegraphEndpoint": "https://sourcegraph.com",
        "sourcegraphToken": "$YOUR_TOKEN",
        "repositoryNames": ["github.com/sourcegraph/cody"]
    }
},
```
