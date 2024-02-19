import { crx } from '@crxjs/vite-plugin'
import react from '@vitejs/plugin-react'
import { defineConfig, type Plugin } from 'vite'
import manifest from './manifest.config'

const viteManifestHackIssue846: Plugin & { renderCrxManifest: (manifest: any, bundle: any) => void } = {
    // TODO(sqs): Workaround from
    // https://github.com/crxjs/chrome-extension-tools/issues/846#issuecomment-1861880919. No longer
    // needed when @crxjs/vite-plugin supports Vite 5.
    name: 'manifestHackIssue846',
    renderCrxManifest(_manifest, bundle) {
        bundle['manifest.json'] = bundle['.vite/manifest.json']
        bundle['manifest.json'].fileName = 'manifest.json'
        // biome-ignore lint/performance/noDelete: Property must be fully deleted.
        delete bundle['.vite/manifest.json']
    },
}

export default defineConfig({
    plugins: [react(), viteManifestHackIssue846, crx({ manifest })],
    server: { strictPort: true, port: 5907, hmr: { port: 5907 } },
    build: {
        minify: false,
    },
    css: {
        devSourcemap: true,
        modules: {
            localsConvention: 'camelCaseOnly',
        },
    },
})
