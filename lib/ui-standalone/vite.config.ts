import { defineConfig } from 'vite'

export default defineConfig({
    css: {
        devSourcemap: true,
        modules: {
            localsConvention: 'camelCaseOnly',
        },
    },
})
