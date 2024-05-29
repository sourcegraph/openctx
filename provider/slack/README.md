# Slack context provider for OpenCtx

This is a context provider for [OpenCtx](https://openctx.org) that brings Slack context to code AI and editors. Slack context provider allows to search for relevant threads when mentioning a slack channel and use all the messages in the thread as the context to AI.

**Status:** Experimental

## Configuration


### Configuration for Sourcegraph teammates

1. Find "OpenCtx Slack provider config" in 1Password and add it to your user settings.
2. Start using the provider!


### Configuration outside of Sourcegraph

To create Slack User Auth token:

1. [Create a slack app for you workspace from scratch from slack api - Click on "Create New App" button.](https://api.slack.com/apps).
2. Go to the "OAuth & Permissions" tab and add the following permission in the User Token Scopes.
 - `channels:history`
 - `channels:read`
 - `search:read`
3. Click on "Install to workspace" on the  "OAuth & Permissions" page.
4. Use the following OpenCtx provider configuration:

```json
"openctx.providers": {
    // ...other providers...
    "https://openctx.org/npm/@openctx/provider-slack": {
      "slackAuthToken": "<AUTH_TOKEN>"
    }
},
```

## Development

- [Source code](https://sourcegraph.com/github.com/sourcegraph/openctx/-/tree/provider/linear)
- [Docs](https://openctx.org/docs/providers/linear)
- License: Apache 2.0
