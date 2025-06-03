## Set up for local development

1. `pnpm i`
2. `pnpm run build`
3. `pnpm run bundle`

When developing locally, configure your provider in the client (e.g., VS Code) by using the path to the bundled .js file:

```json
"openctx.providers": {
    "file:///<path/to/js/bundle>/bundle.js": true,
}
```

## Debug

To see console log statements of your provider, open the vscode developer tools: [`cmd + Shift + P`] > "Toggle Developer Tools".