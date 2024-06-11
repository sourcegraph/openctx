# Azure DevOps Work Items context provider for OpenCtx

[OpenCtx](https://openctx.org) context provider for bringing Azure DevOps work items context into code AI and editors.

## Usage

1. [Create an personal access token](https://learn.microsoft.com/en-us/azure/devops/organizations/accounts/use-personal-access-tokens-to-authenticate?view=azure-devops&tabs=Windows)
2. Configure your OpenCtx client

### Azure DevOps Services

```json
"openctx.providers": {
    // ...other providers...
    "https://openctx.org/npm/@openctx/provider-azure-devops-workitems": {
        "url": "https://dev.azure.com/<account>", 
        "accessToken": "<your-azure-devops-token>",
    }
},
```

### Azure Devops Server (on-prem)

```json
"openctx.providers": {
    // ...other providers...
    "https://openctx.org/npm/@openctx/provider-azure-devops-workitems": {
        "url": "https://your-server-url/<collection_name>", 
        "accessToken": "<your-azure-devops-token>",
    }
},
```

**Note**: This will require a valid SSL certificate if your URL is using HTTPS.

## Mention support

- Searches issues based on title, description, or work item id.
- Displays the recent issues that are assigned to you, you've created, or you've changed

## Context included

Issues:

- URL
- Title
- Description
- Work Item Type
- State
- Assigned To
- Tags 

## Configuration

- `url` — Azure Devops URL — Required (e.g. `"https://dev.azure.com/some-account/"`)
- `accessToken` — access token — Required

## Development

- [Source code](https://sourcegraph.com/github.com/sourcegraph/openctx/-/tree/provider/azure-devops-workitems)
- [Docs](https://openctx.org/docs/providers/azure-devops-workitems)
- License: Apache 2.0
