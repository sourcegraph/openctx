# Jira context provider for OpenCtx

This is a context provider for [OpenCtx](https://openctx.org) that brings Jira context to code AI and editors.

Features:

- Shows recent issues that are assigned to you, you've created, or you've commented on
- Searching issues based on title, summary or issue key (PROJ-123)

## Usage

[Create an API token](https://id.atlassian.com/manage-profile/security/api-tokens) and then configure your OpenCtx client to use this provider:

```json
"openctx.providers": {
    // ...other providers...
    "https://openctx.org/npm/@openctx/provider-jira": {
        "host": "<subdomain>.atlassian.net",
        "username": "<email-address>",
        "apiToken": "<your-atlassian-api-token>",
    }
},
```

## Configuration

This provider configuration is a subset of the configuration for the NotionHQ JavaScript client:

- `host` — Host URL — Required
- `port` — Host port — Optional
- `username` — Username — Required
- `apiToken` — API token — Required

## Development

- [Source code](https://sourcegraph.com/github.com/sourcegraph/openctx/-/tree/provider/jira)
- [Docs](https://openctx.org/docs/providers/jira)
- License: Apache 2.0
