# Excel VBA context provider for OpenCtx

This is a context provider for [OpenCtx](https://openctx.org) that lets you @-mention Excel files (`.xlsm`) and use their VBA scripts as context in code AI tools.

**Status:** experimental

## Usage

Add the following to your settings in any OpenCtx client:

```json
"openctx.providers": {
    // ...other providers...
    "https://openctx.org/npm/@openctx/provider-excel-vba": {
        // TODO(sqs)
    }
},
```


## Development

- [Source code](https://sourcegraph.com/github.com/sourcegraph/openctx/-/tree/provider/excel-vba)
- [Docs](https://openctx.org/docs/providers/excel-vba)
- License: Apache 2.0
