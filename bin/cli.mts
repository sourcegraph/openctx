#!/usr/bin/env -S node --experimental-modules --experimental-network-imports --no-warnings
import path from 'path'
import {
    type Client,
    type ClientConfiguration,
    type Mention,
    type Range,
    createClient,
} from '@openctx/client'
import { of } from 'rxjs'

function usageFatal(message: string): never {
    console.error(message)
    console.error(`\nUsage: OPENCTX_CONFIG=<config> ${path.basename(process.argv[1])} <subcommand>\n`)
    console.error('Subcommands:')
    const subcommands = [
        'meta [providerUri]',
        'mentions <query> [providerUri]',
        'items <message> [providerUri] [mentionJSON]',
    ]
    for (const subcommand of subcommands) {
        console.error(`    ${subcommand}`)
    }
    process.exit(1)
}

async function subcommandMeta(client: Client<Range>, args: string[]): Promise<void> {
    if (args.length > 1) {
        usageFatal('Error: invalid args')
    }
    const [providerUri] = args
    const meta = await client.meta({}, providerUri)

    console.log(JSON.stringify(meta))
}

async function subcommandMentions(client: Client<Range>, args: string[]): Promise<void> {
    if (args.length === 0 || args.length > 2) {
        usageFatal('Error: invalid args')
    }
    const [query, providerUri] = args

    const mentions = await client.mentions({ query }, providerUri)

    if (process.env.OUTPUT_JSON) {
        console.log(JSON.stringify(mentions, null, 2))
    } else {
        for (const [i, item] of mentions.entries()) {
            console.log(`#${i + 1} ${item.title}${item.uri ? ` — ${item.uri}` : ''}`)
            if (item.data) {
                console.log(JSON.stringify(item.data, null, 2))
            }
        }
    }
}

async function subcommandItems(client: Client<Range>, args: string[]): Promise<void> {
    if (args.length === 0 || args.length > 3) {
        usageFatal('Error: invalid args')
    }
    const [message, providerUri, mentionJSON] = args

    let mention: Mention | undefined
    if (mentionJSON) {
        mention = JSON.parse(mentionJSON)
    }

    const items = await client.items({ message, mention }, providerUri)

    if (process.env.OUTPUT_JSON) {
        console.log(JSON.stringify(items, null, 2))
    } else {
        for (const [i, item] of items.entries()) {
            console.log(`#${i + 1} ${item.title}${item.url ? ` — ${item.url}` : ''}`)
            if (item.ui?.hover?.text) {
                console.log(
                    `   - hover.text: ${truncate(
                        item.ui.hover?.text.trim().replace(/(\s|\n)+/g, ' '),
                        100
                    )}`
                )
            }
            if (item.ai?.content) {
                console.log(`   - ai.content: (${item.ai.content.length} characters)`)
            }
        }
    }
}

function truncate(text: string, maxLength: number): string {
    if (text.length > maxLength) {
        return text.slice(0, maxLength) + '...'
    }
    return text
}

const configStr = process.env.OPENCTX_CONFIG
if (!configStr) {
    usageFatal('Error: no config specified in OPENCTX_CONFIG env var')
}

let config: ClientConfiguration
try {
    config = JSON.parse(configStr)
} catch (e) {
    usageFatal('Error: invalid config JSON (from OPENCTX_CONFIG env var)')
}

const client = createClient({
    configuration: () => of(config),
    providerBaseUri: import.meta.url,
    logger: message => console.error('# ' + message),
    makeRange: r => r,
})

const subcommand = process.argv[2]
const args = process.argv.slice(3)
switch (subcommand) {
    case 'meta':
        await subcommandMeta(client, args)
        break
    case 'mentions':
        await subcommandMentions(client, args)
        break
    case 'items':
        await subcommandItems(client, args)
        break
    default:
        usageFatal(`Error: unrecognized subcommand ${JSON.stringify(subcommand)}`)
}
