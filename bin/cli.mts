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
    console.error(
        `\nUsage: OPENCTX_CONFIG=<config> ${path.basename(process.argv[1])} items [query] [mentionJSON]`
    )
    process.exit(1)
}

async function subcommandMentions(client: Client<Range>, args: string[]): Promise<void> {
    if (args.length !== 1) {
        usageFatal('Error: the "mentions" subcommand expects one argument "query"')
    }
    const [query] = args

    const mentions = await client.mentions({ query })

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
    if (args.length !== 1) {
        usageFatal('Error: the "items" subcommand expects one argument "query"')
    }
    const [message, mentionJSON] = args

    let mention: Mention | undefined
    if (mentionJSON) {
        mention = JSON.parse(mentionJSON)
    }

    const items = await client.items({ message, mention })

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
    case 'items':
        await subcommandItems(client, args)
        break
    case 'mentions':
        await subcommandMentions(client, args)
        break
    default:
        usageFatal('Error: only the "capabilities" or "items" subcommand is supported')
}
