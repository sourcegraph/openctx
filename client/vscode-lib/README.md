# OpenCtx library for VS Code extensions

The [`@openctx/vscode-lib`](https://www.npmjs.com/package/@openctx/vscode-lib) npm package is a library that lets VS Code extensions use OpenCtx functionality. The [OpenCtx VS Code extension](https://openctx.org/docs/clients/vscode) uses this library.

## Usage

_Status: experimental, for use by VS Code extension authors only (not end users)_

1. Add `@openctx/vscode-lib` as a dependency to your VS Code extension.
1. In your extension's `activate` function, call `createController({...})`.
1. Add the relevant `contributions` to your extension's `package.json`.

See the [OpenCtx VS Code extension source code](https://sourcegraph.com/github.com/sourcegraph/openctx/-/tree/client/vscode-lib) for an example.

### Developing this library and your VS Code extension

If you want your VS Code extension to automatically incorporate your latest local changes to this package, you can use `pnpm link`.

In your VS Code extension's package directory, run the following (where `$OPENCTX` is the path to the `openctx` repository root):

```shell
cd path/to/your/vscode/extension
pnpm link $OPENCTX/lib/client
pnpm link $OPENCTX/lib/schema
pnpm link $OPENCTX/lib/protocol
pnpm link $OPENCTX/client/vscode-lib
```

## Known issues

- Only 1 activated extension can use this library at a time. If a second extension using this library tries to activate, it will encounter name collisions in the commands it registers.
- Providers that are implemented as JavaScript programs must be bundled to CommonJS to be used with VS Code. (ESM-bundled JavaScript providers only work with the VS Code debug extension host.)

## Development

- [Source code](https://sourcegraph.com/github.com/sourcegraph/openctx/-/tree/client/vscode-lib)
- [Docs](https://openctx.org/docs/clients/vscode)
- License: Apache 2.0
