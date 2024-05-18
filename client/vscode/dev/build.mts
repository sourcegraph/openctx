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
    external: ['vscode'],
    format: 'cjs',
    sourcemap: true,
    treeShaking: true,
    minify: false,
}

const buildOptions: Record<BuildTarget, esbuild.BuildOptions> = {
    desktop: {
        ...commonBuildOptions,
        platform: 'node',
        outfile: 'dist/extension.node.cjs',
        outExtension: { '.js': '.cjs' },
    },
    web: {
        ...commonBuildOptions,
        external: [...commonBuildOptions.external!, 'node:fs/promises'],
        platform: 'browser',
        outfile: 'dist/extension.web.js',
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
