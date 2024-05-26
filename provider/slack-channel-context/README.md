# Slack context provider for OpenCtx

This is a context provider for [OpenCtx](https://openctx.org) that brings Slack context to code AI and editors. Slack context provider allows to search for relevant threads when mentioning a slack channel and use all the messages in the thread as the context to AI.

**Status:** Experimental

## Configuration

To create Slack User Auth token:

1. [Create a slack app from scratch from slack api](https://api.slack.com/apps).
2. Add the following permission in the User Token Scopes. For access to private channels, additional include permissions prefixed with `groups:`
 - `channels:history`
 - `channels:read`
 - `search:read`
 - `groups:history`
 - `groups:read`
3. Use the following OpenCtx provider configuration:

```json
"openctx.providers": {
    // ...other providers...
    "file:///Users/hiteshsagtani/dev/openctx/provider/slack-channel-context/dist/bundle.js": {
      "slackAuthToken": "<AUTH_TOKEN>"
    }
},
```

## Development

- [Source code](https://sourcegraph.com/github.com/sourcegraph/openctx/-/tree/provider/linear)
- [Docs](https://openctx.org/docs/providers/linear)
- License: Apache 2.0
