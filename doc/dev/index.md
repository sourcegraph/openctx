## Development

### Setup

1. Install [rtx](https://github.com/jdx/rtx) (for installing build tools from `.tool-versions`)
   - Use [asdf](https://asdf-vm.com/) instead of [rtx](https://github.com/jdx/rtx) if you prefer.
1. Run `rtx install`
   - If needed, run `rtx plugin add NAME` for any missing plugins.
1. Run `pnpm install`

### Build and run the VS Code extension

Open this repository in VS Code and run the `Launch VS Code Extension (Desktop)` build/debug task (or run `cd client/vscode && pnpm run dev`).

See [client/vscode/CONTRIBUTING.md](../../client/vscode/CONTRIBUTING.md) for more information.
