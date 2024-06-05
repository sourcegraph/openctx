# Confluence context provider for OpenCtx

[OpenCtx](https://openctx.org) context provider for bringing Jira context into code AI and editors.

## Usage

1. [Create an API token](https://id.atlassian.com/manage-profile/security/api-tokens)
2. Configure your OpenCtx client

```json
"openctx.providers": {
    // ...other providers...
    "https://openctx.org/npm/@openctx/provider-confluence": {
        "host": "<subdomain>.atlassian.net",
        "username": "<email-address>",
        "apiToken": "<your-atlassian-api-token>",
    }
},
```

## Mention support

- Searches page titles

## Context included

- Page body

## Configuration

- `host` — Host URL — Required
- `port` — Host port — Optional
- `username` — Username — Required
- `apiToken` — API token — Required

## Development

- [Source code](https://sourcegraph.com/github.com/sourcegraph/openctx/-/tree/provider/confluence)
- [Docs](https://openctx.org/docs/providers/confluence)
- License: Apache 2.0
