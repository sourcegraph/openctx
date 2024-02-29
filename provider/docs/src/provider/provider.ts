import type { CapabilitiesResult, ItemsParams, ItemsResult } from '@openctx/provider'
import { createClient } from '../client/client.ts'
import type { DocID } from '../corpus/doc/doc.ts'
import { type CorpusIndex, type IndexedDoc, fromJSON } from '../corpus/index/corpusIndex.ts'
import type { SearchResult } from '../search/types.ts'
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
            const query = params.query?.trim()
            const results = query ? await client.search({ text: query }) : client.docs

            const items: ItemsResult = []
            const seenDocIDs = new Set<DocID>()
            for (const result of results) {
                const doc = isSearchResult(result) ? client.doc(result.doc) : result
                if (seenDocIDs.has(doc.doc.id)) {
                    continue
                }
                seenDocIDs.add(doc.doc.id)

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

function isSearchResult(value: SearchResult | IndexedDoc): value is SearchResult {
    return 'doc' in value && typeof value.doc === 'number'
}

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
