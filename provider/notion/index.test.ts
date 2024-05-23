import { LogLevel } from '@notionhq/client'
import { describe, expect, test } from 'vitest'
import notion from './index.js'

// You can override these via the environment to test against the actual API.
const query = process.env.NOTION_QUERY ?? 'Get Started'
const auth = process.env.NOTION_API_KEY ?? ''

describe('notion', () => {
    test.runIf(auth)('integration returns non-empty mentions result', async () => {
        const settings = {
            auth,
            logLevel: LogLevel.DEBUG,
        }

        const mentions = await notion.mentions!({ query }, settings)
        console.log(mentions)
        expect(mentions).not.toStrictEqual([])

        const mention = mentions[0]

        const items = await notion.items!({ mention }, settings)
        console.log(items)
        expect(items).not.toStrictEqual([])
    })
})
