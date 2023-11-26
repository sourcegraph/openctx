/**
 * Generates TypeScript types for a JSON Schema.
 */

import { readFile } from 'fs/promises'
import path from 'path'
import { pathToFileURL } from 'url'
import { type ResolverOptions } from 'json-schema-ref-parser'
import { compile as compileJSONSchema } from 'json-schema-to-typescript'

/**
 * Allow json-schema-ref-parser to resolve the v7 draft of JSON Schema
 * using a local copy of the spec for offline development.
 */
const draftV7resolver: ResolverOptions = {
    order: 1,
    read: () => readFile(path.join(__dirname, 'json-schema-draft-07.schema.json')),
    canRead: file => file.url === 'http://json-schema.org/draft-07/schema',
}

async function generateSchema(schemaPath: string, preamble?: string): Promise<void> {
    const schema = await readFile(schemaPath, 'utf8')
    const types = await compileJSONSchema(JSON.parse(schema), 'settings.schema', {
        bannerComment: '', // no eslint-disable
        cwd: path.dirname(schemaPath),
        $refOptions: {
            resolve: {
                draftV7resolver,
                // There should be no reason to make network calls during this process. If there
                // are, we've broken the dev env for offline development and increased dev startup
                // time.
                //
                // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
                http: false as any,
            },
        },
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
