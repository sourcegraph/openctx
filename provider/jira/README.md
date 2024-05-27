# Jira context provider for OpenCtx

This is a context provider for [OpenCtx](https://openctx.org) that brings Jira context to code AI and editors. 

**Status:** Experimental

## Configuration

[Create an API token](https://id.atlassian.com/manage-profile/security/api-tokens) and then use the following OpenCtx provider configuration:

```json
"openctx.providers": {
    // ...other providers...
    "https://openctx.org/npm/@openctx/provider-jira": {
        "endpoint": "https://<subdomain>.atlassian.net/rest/api/",
        "username": "<email-address>",
        "apiToken": "<your-atlassian-api-token>",
    }
},
```

## Development

- [Source code](https://sourcegraph.com/github.com/sourcegraph/openctx/-/tree/provider/jira)
- [Docs](https://openctx.org/docs/providers/jira)
- License: Apache 2.0
