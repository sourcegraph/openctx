// @ts-check

const baseConfig = require('@sourcegraph/prettierrc')

/** @type {import('prettier').Config} */
module.exports = {
  ...baseConfig,
  plugins: [...(baseConfig.plugins || []), '@ianvs/prettier-plugin-sort-imports'],
  overrides: [
    ...baseConfig.overrides,
    // In *.mdx files, printWidth wrapping breaks up elements so that there are nested HTML
    // tags, which means that client-side hydration fails.
    { files: '**/*.mdx', options: { proseWrap: 'preserve', printWidth: Number.MAX_SAFE_INTEGER, tabWidth: 2 } },
  ],
}
