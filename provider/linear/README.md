# Linear context provider for OpenCtx

This is a context provider for [OpenCtx](https://openctx.org) that brings Linear context to code AI and editors. Only items, not annotations, are supported.

**Status:** Experimental

## Configuration for Sourcegraph teammates

1. Find "OpenCtx Linear provider config" in 1Password and add it to your user settings.
1. Start using the provider!

## Configuration outside of Sourcegraph

To create Linear API credentials:

1. [Create an OAuth2 application in Linear](https://linear.app/settings/api/applications/new).
1. Save the client configuration JSON file (`linear_client_config.json`).
1. Obtain an access token for your user account: run `LINEAR_OAUTH_CLIENT_FILE=path/to/linear_client_config.json pnpm auth` and continue in your web browser.
1. The access token will be saved in a JSON file with a path printed to the console.

Then use the following OpenCtx provider configuration:

```json
"openctx.providers": {
    // ...other providers...
    "https://openctx.org/npm/@openctx/provider-linear": {
        "linearUserCredentialsPath": "path/to/access_token_file_printed.json",
    }
},
```

## Development

- [Source code](https://sourcegraph.com/github.com/sourcegraph/openctx/-/tree/provider/linear)
- [Docs](https://openctx.org/docs/providers/linear)
- License: Apache 2.0
