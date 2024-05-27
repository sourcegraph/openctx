
import path from 'path'
import { describe, expect, test } from 'vitest'
import type { AnnotationsResult, MetaResult } from '@openctx/provider'

import techstack, { type Settings } from './index.js'

describe('techstack', () => {
    const SETTINGS: Settings = {
        yaml: path.resolve(path.join(__dirname, './examples/mazure.yml'))
    }

    test('meta', () => {
        const result = techstack.meta({}, SETTINGS)

        expect(result).toBeDefined()
        expect(result).toStrictEqual<MetaResult>({
            name: 'TechStack File',
            selector: [{ path: '**/*.js?(x)' }, { path: '**/*.ts?(x)' }],
            features: { mentions: false }
        })
    })

    test('annotations', async () => {
        let params = {
            uri: 'file:///a/b.ts',
            content: `
import fs from 'fs'

fs.readFileSync('example.txt', 'utf-8)
`
        }
        let result = await techstack.annotations(params, SETTINGS)
        expect(result).toBeDefined()
        expect(result).toStrictEqual<AnnotationsResult>([])

        SETTINGS.yaml = path.resolve(path.join(__dirname, './examples/stackshare.yml'))
        result = await techstack.annotations(params, SETTINGS)
        expect(result).toBeDefined()
        expect(result).toStrictEqual<AnnotationsResult>([])

        params = {
            uri: 'file:///c/d.ts',
            content: `
var sass = require('node-sass');
sass.render({
    file: scss_filename,
    [, options..]
}, function(err, result) { /*...*/ });
// OR
var result = sass.renderSync({
    data: scss_content
    [, options..]
});
            `
        }
        result = await techstack.annotations(params, SETTINGS)
        expect(result).toBeDefined()
        expect(result.length).toEqual(1)
        expect(result[0].uri).toEqual(params.uri)
        expect(result[0].item.title).includes('npm Packages')
        expect(result[0].item.url).toEqual('https://www.npmjs.com/node-sass')

        params.content = `
var sass = require('node-sass');
sass.render({
    file: scss_filename,
    [, options..]
}, function(err, result) { /*...*/ });
// OR
sass = require('node-sass')  // unexpected import
        `
        result = await techstack.annotations(params, SETTINGS)
        expect(result).toBeDefined()
        expect(result.length).toEqual(2)

        expect(result[0].range?.start.line).toEqual(1)
        expect(result[0].range?.end.line).toEqual(1)

        expect(result[1].range?.start.line).toEqual(7)
        expect(result[1].range?.end.line).toEqual(7)
    })
})
