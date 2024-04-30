import path from 'path'
import { type ClientConfiguration, createClient } from '@openctx/client'
import { of } from 'rxjs'

const args = process.argv.slice(2)

const configStr = process.env.OPENCTX_CONFIG
const subcommand = args[0]
const query = args[1]

const USAGE = `\nUsage: OPENCTX_CONFIG=<config> ${path.basename(process.argv[1])} items [query]`
if (subcommand !== 'items') {
    console.error('Error: only the "items" subcommand is supported')
    console.error(USAGE)
    process.exit(1)
}
if (args.length !== 1 && args.length !== 2) {
    console.error('Error: invalid arguments')
    console.error(USAGE)
    process.exit(1)
}
if (!configStr) {
    console.error('Error: no config specified in OPENCTX_CONFIG env var')
    console.error(USAGE)
    process.exit(1)
}

let config: ClientConfiguration
try {
    config = JSON.parse(configStr)
} catch (e) {
    console.error('Error: invalid config JSON (from OPENCTX_CONFIG env var)')
    console.error(USAGE)
    process.exit(1)
}

const client = createClient({
    configuration: () => of(config),
    logger: message => console.error('# ' + message),
    makeRange: r => r,
})

const items = await client.items({ query })

if (process.env.OUTPUT_JSON) {
    console.log(JSON.stringify(items, null, 2))
} else {
    for (const [i, item] of items.entries()) {
        console.log(`#${i + 1} ${item.title}${item.url ? ` — ${item.url}` : ''}`)
        if (item.ui?.hover?.text) {
            console.log(
                `   - hover.text: ${truncate(item.ui.hover?.text.trim().replace(/(\s|\n)+/g, ' '), 100)}`
            )
        }
        if (item.ai?.content) {
            console.log(`   - ai.content: (${item.ai.content.length} characters)`)
        }
    }
}

function truncate(text: string, maxLength: number): string {
    if (text.length > maxLength) {
        return text.slice(0, maxLength) + '...'
    }
    return text
}
