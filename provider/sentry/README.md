# Sentry issue context provider for OpenCtx

This is a context provider for [OpenCtx](https://openctx.org) that fetches contents from a Sentry issue by just pasting the URL to it.

## Usage

Add the following to your settings in any OpenCtx client:

```json
"openctx.providers": {
    // ...other providers...
    "https://openctx.org/npm/@openctx/provider-sentry": true
},
```

Then use the `@`-mention type **Sentry Issues** and enter a URL, such as `https://sourcegraph.sentry.io/issues/1234567890/?project=1234567&query=is%3Aunresolved+issue.priority%3A%5Bhigh%2C+medium%5D&referrer=issue-stream&statsPeriod=14d&stream_index=17`, to include the context in the Sentry issue.

## Setup

For this provider to work, you need to provide an API token for your Sentry account.

To obtain one:

1. Go to Sentry
2. Click on your organization in the top left corner
3. In the dropdown, select "User auth tokens"
4. Create a new auth token on that page. For scopes, select `event:read, project:read`

Then, add the token to your OpenCtx settings:

```json
"openctx.providers": {
    // ...other providers...
    "https://openctx.org/npm/@openctx/provider-sentry": {
        "apiToken": "SENTRYTOKENHERE",
        // or:
        "apiTokenPath": "path/to/file/withsentrytoken"
    }
},
```

## Development

- [Source code](https://sourcegraph.com/github.com/sourcegraph/openctx/-/tree/provider/sentry)
- [Docs](https://openctx.org/docs/providers/sentry)
- License: Apache 2.0
