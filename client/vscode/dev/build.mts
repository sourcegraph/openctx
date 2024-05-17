import * as esbuild from 'esbuild'

type BuildTarget = 'desktop' | 'web'
function getBuildTarget(): BuildTarget {
    const target = process.env.BUILD_TARGET
    if (target !== 'desktop' && target !== 'web') {
        throw new Error('BUILD_TARGET must be either "desktop" or "web"')
    }
    return target
}
const buildTarget = getBuildTarget()

const commonBuildOptions: esbuild.BuildOptions = {
    entryPoints: ['src/extension.ts'],
    bundle: true,
    external: ['vscode', 'esbuild-wasm/esbuild.wasm', 'fs/promises'],
    format: 'cjs',
    sourcemap: true,
    minify: false,
}

const buildOptions: Record<BuildTarget, esbuild.BuildOptions> = {
    desktop: {
        ...commonBuildOptions,
        platform: 'node',
        outfile: 'dist/extension.node.cjs',
        outExtension: { '.js': '.cjs' },
        define: { ...commonBuildOptions.define, 'process.env.DESKTOP_BUILD': 'true' },
    },
    web: {
        ...commonBuildOptions,
        platform: 'browser',
        outfile: 'dist/extension.web.js',
        define: { ...commonBuildOptions.define, 'process.env.DESKTOP_BUILD': 'false' },
        alias: { ...commonBuildOptions.alias, path: 'path-browserify' },
    },
}

const WATCH = process.argv.includes('--watch')
if (WATCH) {
    const ctx = await esbuild.context(buildOptions[buildTarget])
    await ctx.rebuild()
    await ctx.watch({})
} else {
    await esbuild.build(buildOptions[buildTarget])
}
