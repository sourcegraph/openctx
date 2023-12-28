/**
 * Generates TypeScript types for a JSON Schema.
 */

import { readFile } from 'fs/promises'
import path from 'path'
import { pathToFileURL } from 'url'
import { compile as compileJSONSchema } from 'json-schema-to-typescript'

async function generateSchema(schemaPath: string, preamble?: string): Promise<void> {
    const schema = await readFile(schemaPath, 'utf8')
    const types = await compileJSONSchema(JSON.parse(schema), 'settings.schema', {
        bannerComment: '', // no eslint-disable
        cwd: path.dirname(schemaPath),
        additionalProperties: false,
        strictIndexSignatures: true,
    })

    if (preamble) {
        console.log(preamble)
    }
    console.log(types)
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
    try {
        const args = process.argv.slice(2)
        if (args.length !== 1 && args.length !== 2) {
            throw new Error('Args: <schema-file> [preamble]')
        }
        await generateSchema(args[0], args[1])
    } catch (error) {
        console.error(error)
        process.exit(1)
    }
}
