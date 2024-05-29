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

### Usage with other GitHub instances

By default, this provider talks to GitHub.com. Add the URL to your GitHub Enterprise Server or GitHub AE instance to the configuration to point this openctx provider at that:

```json
"openctx.providers": {
    // ...other providers...
    "https://openctx.org/npm/@openctx/provider-github": {
        // create an access token from here: https://github.com/settings/tokens/new?scopes=repo
        "accessToken": "<your-access-token>",
        "baseURL": "https://ghe.example.com"
    }
},
```

Then use the `@`-mention type **Github PRs & Issues** and search for issues or pull requests to include in context using the followining possible query examples:

- <https://github.com/sourcegraph/sourcegraph/issues/1234>
- <https://github.com/sourcegraph/sourcegraph/pull/1234>
- <https://ghe.example.com/sourcegraph/sourcegraph/pull/1234>
- github.com/sourcegraph/sourcegraph/issues/1234
- ghe.example.com/sourcegraph/sourcegraph/issues/1234
- sourcegraph/sourcegraph/issues/1234
- sourcegraph/sourcegraph:1234

## Development

- [Source code](https://sourcegraph.com/github.com/sourcegraph/openctx/-/tree/provider/github)
- [Docs](https://openctx.org/docs/providers/github)
- License: Apache 2.0
