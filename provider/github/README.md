# GitHub provider for OpenCtx

This is a context provider for [OpenCtx](https://openctx.org) that fetches pull requests and issues contents from GitHub.

## Usage

Add the following to your settings in any OpenCtx client:

```json
"openctx.providers": {
    // ...other providers...
    "https://openctx.org/npm/@openctx/provider-github": {
        // create an access token from here: https://github.com/settings/tokens/new?scopes=repo
        "accessToken": "<your-access-token>",
    }
},
```

Then use the `@`-mention type **Github PRs & Issues** and search for issues or pull requests to include in context using the followining possible query examples:

- issue:sourcegraph/cody/123
- pr:sourcegraph/cody/456

## Development

- [Source code](https://sourcegraph.com/github.com/sourcegraph/openctx/-/tree/provider/github)
- [Docs](https://openctx.org/docs/providers/github)
- License: Apache 2.0
