# Slack context provider for OpenCtx

This is a context provider for [OpenCtx](https://openctx.org) that brings Slack context to code AI and editors. Slack context provider allows to search for relevant threads when mentioning a slack channel and use all the messages in the thread as the context to AI.

**Status:** Experimental

## Configuration

To create Slack User Auth token:

1. [Create a slack app for you workspace from scratch using slack api - Click on "Create New App" button.](https://api.slack.com/apps).
2. Go to the "OAuth & Permissions" tab and add the following permission in the User Token Scopes.
 - `channels:history`
 - `channels:read`
 - `search:read`
3. Click on "Install to workspace".
4. Copy the "User OAuth Token" and use it as the `slackAuthToken` in the OpenCtx provider configuration.
5. Use the following OpenCtx provider configuration:


```json
"openctx.providers": {
    // ...other providers...
    "https://openctx.org/npm/@openctx/provider-slack": {
      "slackAuthToken": "<USER OAuth Token>"
    }
},
```

## Development

- [Source code](https://sourcegraph.com/github.com/sourcegraph/openctx/-/tree/provider/linear)
- [Docs](https://openctx.org/docs/providers/linear)
- License: Apache 2.0
