/**
 * Convert from ESM JavaScript to CommonJS.
 *
 * NOTE(sqs): This is hacky! I hope VS Code starts supporting ESM import() in VS Code extensions
 * soon so we can get rid of this! See https://github.com/microsoft/vscode/issues/130367.
 *
 * @param esm An ESM JavaScript string, assumed to have no import() calls.
 */
export function esmToCommonJS(esm: string): string {
    // Convert import statements.
    let cjs = esm.replace(/(?<=^|\b)import\s+(\w+)\s+from\s+['"](.+)['"]/gm, "const $1 = require('$2');")
    cjs = cjs.replace(
        /(?<=^|\b)import\s+\{\s+([\w\d]+)\s+as\s+([\w\d]+)\s+\}\s+from\s+['"](.+)['"]/gm,
        "const $2 = require('$3').$1;",
    )
    cjs = cjs.replace(
        /(?<=^|\b)import\s*\{\s*([\w\s,]+)\s*\}\s+from\s+['"](.+)['"]/gm,
        "const { $1} = require('$2');",
    )
    cjs = cjs.replace(
        /(?<=^|\b)import\s+\*\s+as\s+(\w+)\s+from\s+['"](.+)['"]/gm,
        "const $1 = require('$2');",
    )

    // Convert export default statements.
    cjs = cjs.replace(/(?<=^|\b)export\s+default\s+/gm, 'module.exports = ')

    // Convert named export statements.
    cjs = cjs.replace(
        /(?<=^|\b)export\s*\{\s*(?:[^},]*,\s*)*([\w\s,]+) as default\s*\}/gm,
        'module.exports = $1;',
    )
    cjs = cjs.replace(/(?<=^|\b)export\s*\{\s*([\w\s,]+)\s*\}/gm, 'module.exports = { $1};')
    cjs = cjs.replace(/(?<=^|\b)export\s+const\s+(\w+)\s*=\s*(.+);/gm, 'exports.$1 = $2;')
    cjs = cjs.replace(
        /(?<=^|\b)export\s+function\s+(\w+)\s*\((.*)\)\s*\{/gm,
        'exports.$1 = function $1($2) {',
    )
    cjs = cjs.replace(/(?<=^|\b)export\s+class\s+(\w+)\s*\{/gm, 'exports.$1 = class $1 {')

    return cjs
}
