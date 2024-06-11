# Azure DevOps context provider for OpenCtx

[OpenCtx](https://openctx.org) context provider for bringing Azure DevOps context into code AI and editors.

## Usage

1. [Create an personal access token](https://learn.microsoft.com/en-us/azure/devops/organizations/accounts/use-personal-access-tokens-to-authenticate?view=azure-devops&tabs=Windows)
2. Configure your OpenCtx client

```json
"openctx.providers": {
    // ...other providers...
    "https://openctx.org/npm/@openctx/provider-azure-devops": {
        "url": "https://dev.azure.com/<account>", 
        "accessToken": "<your-azure-devops-token>",
    }
},
```

## Mention support

- Searches issues based on title, summary, or issue id (46).
- Displays the recent issues that are assigned to you, you've created, or you've changed

## Context included

Issues:

- URL
- Summary
- Description
- Labels 

## Configuration

- `url` — Azure Devops URL — Required (e.g. `"https://dev.azure.com/some-account/"`)
- `accessToken` — access token — Required

## Development

- [Source code](https://sourcegraph.com/github.com/sourcegraph/openctx/-/tree/provider/jira)
- [Docs](https://openctx.org/docs/providers/azure-devops)
- License: Apache 2.0
