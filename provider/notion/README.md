# Notion context provider for OpenCtx

This is a context provider for [OpenCtx](https://openctx.org) that provides Notion results as context via the mentions and items APIs.

## Usage

Add the following to your settings in any OpenCtx client:

```json
"openctx.providers": {
    // ...other providers...
    "https://openctx.org/npm/@openctx/provider-notion": {
        "auth": "<your notion bot access token>"
    }
},
```

See https://developers.notion.com/docs/getting-started to get set up with a
token for the Notion API.

Remember to add your integration to a page such that it can search that page and
all sub pages.

## Configuration

This provider configuration is a subset of the configuration for the NotionHQ JavaScript client:

| Option      | Default value              | Type         | Description                                                                                                                                                  |
| ----------- | -------------------------- | ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `auth`      | N/A                        | `string`     | Bearer token for authentication. Required.                                                                                                                   |
| `logLevel`  | `warn`                     | `string`     | Verbosity of logs the instance will produce. Levels are debug, info, warn and error.                                                                         |
| `timeoutMs` | `60_000`                   | `number`     | Number of milliseconds to wait before emitting timing out an API call to Notion.                                                                             |

## Development

- [Source code](https://sourcegraph.com/github.com/sourcegraph/openctx/-/tree/provider/notion)
- [Docs](https://openctx.org/docs/providers/notion)
- License: Apache 2.0
