#!/usr/bin/env -S node --experimental-modules --experimental-network-imports --no-warnings
import { readFileSync } from 'fs'
import path from 'path'
import { pathToFileURL } from 'url'
import {
    type Client,
    type ClientConfiguration,
    type Item,
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
        'mention-items <query> [mentionIndex] [providerUri]',
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
    const meta = await client.meta({}, { providerUri })

    if (process.env.OUTPUT_JSON) {
        console.log(JSON.stringify(meta, null, 2))
    } else {
        for (const [i, item] of meta.entries()) {
            console.log(`#${i + 1} ${item.name}`)
            if (item.mentions) {
                console.log(`    - mentions ${JSON.stringify(item.mentions)}`)
            }
            if (item.annotations) {
                console.log(`    - annotations ${JSON.stringify(item.annotations)}`)
            }
        }
    }
}

async function subcommandMentions(client: Client<Range>, args: string[]): Promise<void> {
    if (args.length === 0 || args.length > 2) {
        usageFatal('Error: invalid args')
    }
    const [query, providerUri] = args

    const mentions = await client.mentions({ query }, { providerUri })

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

    const items = await client.items({ message, mention }, { providerUri })
    printItems(items)
}

async function subcommandMentionItems(client: Client<Range>, args: string[]): Promise<void> {
    if (args.length === 0 || args.length > 3) {
        usageFatal('Error: invalid args')
    }
    const [query, itemIndex, providerUri] = args

    const mentions = await client.mentions({ query }, { providerUri })
    const mention = mentions[Number.parseInt(itemIndex ?? 0)]
    const items = await client.items({ mention }, { providerUri: mention.providerUri })
    printItems(items)
}

function printItems(items: Item[]): void {
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

function defaultProviderConfig(providerURI: string): ClientConfiguration {
    const providers: Record<string, boolean> = {}
    providers[providerURI] = true
    return {
        enable: true,
        debug: true,
        providers,
    }
}

function loadConfig(): ClientConfiguration {
    const configEnv = process.env.OPENCTX_CONFIG ?? 'config.json'
    // Raw config in environment variable
    if (configEnv.startsWith('{')) {
        return JSON.parse(configEnv)
    }
    // A URL to a provider
    if (configEnv.startsWith('http') || configEnv.startsWith('file')) {
        return defaultProviderConfig(configEnv)
    }
    // A path to a bundle
    if (configEnv.endsWith('.js')) {
        return defaultProviderConfig(pathToFileURL(configEnv).toString())
    }
    return JSON.parse(readFileSync(configEnv, 'utf-8'))
}

let config: ClientConfiguration
try {
    config = loadConfig()
} catch (e) {
    usageFatal(
        'Error: invalid OPENCTX_CONFIG env var. Must be one of:\n- JSON object of config\n- Path to JSON config\n- Provider URI\n- Path to provider bundle'
    )
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
    case 'mention-items':
        await subcommandMentionItems(client, args)
        break
    default:
        usageFatal(`Error: unrecognized subcommand ${JSON.stringify(subcommand)}`)
}

process.exit(0)
