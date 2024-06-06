# Jira context provider for OpenCtx

[OpenCtx](https://openctx.org) context provider for bringing Jira context into code AI and editors.

## Usage

1. [Create an API token](https://id.atlassian.com/manage-profile/security/api-tokens)
2. Configure your OpenCtx client

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

## Mention support

- Searches issues based on title, summary, or issue key (PROJ-123).
- Displays the recent issues that are assigned to you, you've created, or you've commented on

## Context included

Issues:

- URL
- Summary
- Description
- Labels
- Subtasks (max 10)

## Configuration

- `host` — Host URL — Required
- `port` — Host port — Optional
- `username` — Username — Required
- `apiToken` — API token — Required

## Development

- [Source code](https://sourcegraph.com/github.com/sourcegraph/openctx/-/tree/provider/jira)
- [Docs](https://openctx.org/docs/providers/jira)
- License: Apache 2.0
