import { defineConfig } from 'vite'
import monacoEditorPlugin from 'vite-plugin-monaco-editor'

export default defineConfig(({ mode }) => ({
    plugins: [monacoEditorPlugin.default({})],
    resolve: {
        alias:
            mode === 'development'
                ? [
                      // In dev mode, build from TypeScript sources so we don't need to run `tsc -b`
                      // in the background.
                      //
                      // TODO(sqs): dedupe with other places in this repo that do this
                      {
                          find: /^(@openctx\/[\w-]+)$/,
                          replacement: '$1/src/index',
                      },
                  ]
                : [],
    },
    css: {
        devSourcemap: true,
        modules: {
            localsConvention: 'camelCaseOnly',
        },
    },
    server: {
        port: 5901,
    },
    test: { name: 'monaco-editor-demo' },
}))
