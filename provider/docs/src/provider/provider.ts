import type { CapabilitiesResult, ItemsParams, ItemsResult } from '@openctx/provider'
import { createClient } from '../client/client.ts'
import { type CorpusIndex, fromJSON } from '../corpus/index/corpusIndex.ts'
import { multiplex } from './multiplex.ts'

/** Settings for the docs OpenCtx provider. */
export interface Settings {
    index: string
}

/**
 * An [OpenCtx](https://openctx.org) provider that adds contextual documentation to your
 * code from an existing documentation corpus.
 */
export default multiplex<Settings>(async settings => {
    const index = await fetchIndex(settings.index)
    const client = createClient(index, { logger: console.debug })

    return {
        capabilities(): CapabilitiesResult {
            return {}
        },

        async items(params: ItemsParams): Promise<ItemsResult> {
            const items: ItemsResult = []
            for (const [i, doc] of client.docs.entries()) {
                const MAX_RESULTS = 5
                if (i >= MAX_RESULTS) {
                    break
                }

                items.push({
                    title: doc.content?.title || doc.doc?.url || 'Untitled',
                    url: doc.doc?.url,
                    ui: {
                        hover: doc.content?.textContent
                            ? { text: truncate(doc.content?.textContent, 200) }
                            : undefined,
                    },
                    ai: {
                        content: doc.content?.textContent,
                    },
                })
            }

            if (items.length >= 2) {
                // Trim common suffix (which is often the name of the doc site, like " - My Doc
                // Site").
                const suffix = longestCommonSuffix(items.map(r => r.title))
                if (suffix) {
                    for (const r of items) {
                        // Don't trim suffix if it would result in an empty or very short string.
                        if (r.title.length >= suffix.length + 10) {
                            r.title = r.title.slice(0, -1 * suffix.length)
                        }
                    }
                }
            }

            // Truncate titles. Do this after trimming common suffixes, or else no common suffix
            // will be found if any titles were truncated.
            for (const r of items) {
                r.title = truncate(r.title, 50)
            }

            return items
        },
    }
})

async function fetchIndex(urlStr: string): Promise<CorpusIndex> {
    const url = new URL(urlStr)
    if (url.protocol === 'file:') {
        const { readFile } = await import('node:fs/promises')
        return fromJSON(JSON.parse(await readFile(url.pathname, 'utf-8')))
    }

    const resp = await fetch(urlStr)
    if (!resp.ok) {
        throw new Error(`Failed to fetch corpus index from ${urlStr} with HTTP status ${resp.status}`)
    }
    return fromJSON(await resp.json())
}

function longestCommonSuffix(texts: string[]): string {
    if (texts.length === 0) {
        return ''
    }
    if (texts.length === 1) {
        return texts[0]
    }

    const minLen = Math.min(...texts.map(text => text.length))
    let suffix = ''

    for (let i = 0; i < minLen; i++) {
        // Get the current character from the end of the first string.
        const currentChar = texts[0][texts[0].length - 1 - i]

        // Check if this character is present at the same position from the end in all strings.
        if (texts.every(text => text[text.length - 1 - i] === currentChar)) {
            // If so, prepend it to the result.
            suffix = currentChar + suffix
        } else {
            break
        }
    }

    return suffix
}

function truncate(text: string, maxLength: number): string {
    if (text.length > maxLength) {
        return text.slice(0, maxLength) + '...'
    }
    return text
}
