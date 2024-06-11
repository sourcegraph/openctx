# Jira context provider for OpenCtx

[OpenCtx](https://openctx.org) context provider for bringing Jira context into code AI and editors.

## Usage

1. [Create an API token](https://id.atlassian.com/manage-profile/security/api-tokens)
2. Configure your OpenCtx client

```json
"openctx.providers": {
    // ...other providers...
    "https://openctx.org/npm/@openctx/provider-jira": {
        "url": "https://<subdomain>.atlassian.net/",
        "email": "<email-address>",
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

- `url` — Jira URL — Required (e.g. `"https://some-org.atlassian.net/"`)
- `email` — Email — Required
- `apiToken` — API token — Required

## Development

- [Source code](https://sourcegraph.com/github.com/sourcegraph/openctx/-/tree/provider/jira)
- [Docs](https://openctx.org/docs/providers/jira)
- License: Apache 2.0
