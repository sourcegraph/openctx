# Jira context provider for OpenCtx

This is a context provider for [OpenCtx](https://openctx.org) that brings Jira context to code AI and editors. It supports:

- Showing recent issues that are assigned to you, you've created, or you've commented on
- Searching issues based on title, summary or issue key (PROJ-123)

**Status:** Experimental

## Configuration

[Create an API token](https://id.atlassian.com/manage-profile/security/api-tokens) and then use the following OpenCtx provider configuration:

```json
"openctx.providers": {
    // ...other providers...
    "https://openctx.org/npm/@openctx/provider-jira": {
        "host": "<subdomain>.atlassian.net",
        // optional: "port": "443",
        "username": "<email-address>",
        "apiToken": "<your-atlassian-api-token>",
    }
},
```

## Development

- [Source code](https://sourcegraph.com/github.com/sourcegraph/openctx/-/tree/provider/jira)
- [Docs](https://openctx.org/docs/providers/jira)
- License: Apache 2.0
