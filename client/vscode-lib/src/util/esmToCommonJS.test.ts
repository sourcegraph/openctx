import { describe, expect, test } from 'vitest'
import { esmToCommonJS } from './esmToCommonJS.js'

describe('esmToCommonJS', () => {
    test('default import statements', () => {
        const esm = "import foo from './foo.js'"
        const expected = "const foo = require('./foo.js');"
        expect(esmToCommonJS(esm)).toBe(expected)
    })

    test('named import statements', () => {
        const esm = "import { foo, bar } from './foobar.js'"
        const expected = "const { foo, bar } = require('./foobar.js');"
        expect(esmToCommonJS(esm)).toBe(expected)
    })

    test("aliased import statements", () => {
        const esm = "import { foo as foo2 } from './foo.js'"
        const expected = "const foo2 = require('./foo.js').foo;"
        expect(esmToCommonJS(esm)).toBe(expected)
    })

    test('namespace import statements', () => {
        const esm = "import * as foobar from './foobar.js'"
        const expected = "const foobar = require('./foobar.js');"
        expect(esmToCommonJS(esm)).toBe(expected)
    })


    test('default export identifiers', () => {
        const esm = 'export default foo'
        const expected = 'module.exports = foo'
        expect(esmToCommonJS(esm)).toBe(expected)
    })

    test('default export literals', () => {
        const esm = 'export default { a: 123 }'
        const expected = 'module.exports = { a: 123 }'
        expect(esmToCommonJS(esm)).toBe(expected)
    })

    test('default export multi-line literals', () => {
        const esm = 'export default { a: 123\nb: 456 }'
        const expected = 'module.exports = { a: 123\nb: 456 }'
        expect(esmToCommonJS(esm)).toBe(expected)
    })

    test('named export statements', () => {
        const esm = 'export { foo, bar }'
        const expected = 'module.exports = { foo, bar };'
        expect(esmToCommonJS(esm)).toBe(expected)
    })

    test('named export statements with "as" keyword', () => {
        const esm = 'export { foo as default }'
        const expected = 'module.exports = foo;'
        expect(esmToCommonJS(esm)).toBe(expected)
    })

    test('export const statements', () => {
        const esm = 'export const foo = 123;'
        const expected = 'exports.foo = 123;'
        expect(esmToCommonJS(esm)).toBe(expected)
    })

    test('export function statements', () => {
        const esm = 'export function foo(bar) {'
        const expected = 'exports.foo = function foo(bar) {'
        expect(esmToCommonJS(esm)).toBe(expected)
    })

    test('export class statements', () => {
        const esm = 'export class Foo {'
        const expected = 'exports.Foo = class Foo {'
        expect(esmToCommonJS(esm)).toBe(expected)
    })

    test('minified code 1', () => {
        const esm = 'var s=1;export{s as default}'
        const expected = 'var s=1;module.exports = s;'
        expect(esmToCommonJS(esm)).toBe(expected)
    })

    test('minified code 2', () => {
        const esm = 'function(){}export{s as default}'
        const expected = 'function(){}module.exports = s;'
        expect(esmToCommonJS(esm)).toBe(expected)
    })

    test('minified code 3', () => {
        const esm = 'export{x as y,s as default}'
        const expected = 'module.exports = s;'
        expect(esmToCommonJS(esm)).toBe(expected)
    })
})
