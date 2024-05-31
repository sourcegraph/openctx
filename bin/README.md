# OpenCtx CLI

The `@openctx/cli` package is a command-line interface for interacting with OpenCtx providers.

## Usage

The OpenCtx CLI requires Node 22 or later (see known issues below).

```shell
$ npm install -g @openctx/cli@latest

$ export OPENCTX_CONFIG='{"enable":true,"debug":true,"providers":{"https://openctx.org/npm/@openctx/provider-web": true}}'

$ openctx meta
[{"name":"URLs", "annotations": {"selectors": []}, ...}]

$ openctx mentions https://example.com
#1 Example Domain — https://example.com

$ openctx items https://example.com
#1 Example Domain — https://example.com
   - hover.text: Fetched from https://example.com
   - ai.content: (575 characters)
```

`OPENCTX_CONFIG` can be one of:
- JSON object of config
- Path to JSON config
- Provider URI
- Path to provider bundle

## Known issues

- Using providers from JavaScript bundles fetched over HTTPS requires [Node 22](https://nodejs.org/api/esm.html#https-and-http-imports) and running with the `node --experimental-modules --experimental-network-imports` option. These experimental flags are set in the `openctx` CLI when it invokes `node`, so you *should* not need to manually pass these.

## Development

- [Source code](https://sourcegraph.com/github.com/sourcegraph/openctx/-/tree/bin)
- [Docs](https://openctx.org/docs/clients/cli)
- License: Apache 2.0
