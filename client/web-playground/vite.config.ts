import { resolve } from 'node:path'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig(({ mode }) => ({
    plugins: [react()],
    resolve: {
        alias:
            mode === 'development'
                ? [
                      // In dev mode, build from TypeScript sources so we don't need to run `tsc -b`
                      // in the background.
                      //
                      // TODO(sqs): dedupe with other places in this repo that do this
                      {
                          find: /^(@openctx\/[\w-]+|@sourcegraph\/cody-.*|@sourcegraph\/prompt-editor)$/,
                          replacement: '$1/src/index',
                      },

                      // HACK(sqs): It appears that @sourcegraph/cody-shared depends on the npm
                      // `ignore` package but does not declare its dependency. This is a workaround.
                      {
                          find: 'ignore',
                          replacement: '/dev/null',
                      },
                  ]
                : [],
    },
    define: {
        'process.env.CODY_SHIM_TESTING': 'false',
    },
    css: {
        devSourcemap: true,
        modules: {
            localsConvention: 'camelCaseOnly',
        },
    },
    server: {
        port: 5900,
    },
    build: {
        emptyOutDir: false,
        outDir: 'dist',
        rollupOptions: {
            watch: {
                // https://rollupjs.org/configuration-options/#watch
                include: ['src/**'],
                exclude: ['node_modules'],
            },
            input: {
                index: resolve(__dirname, 'index.html'),
            },
            output: {
                entryFileNames: '[name].js',
            },
        },
    },
}))
