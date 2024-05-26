import type {
    ItemsParams,
    ItemsResult,
    MentionsParams,
    MentionsResult,
    MetaResult,
} from '@openctx/provider'
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
        meta(): MetaResult {
            return {
                name: 'docs.anthropic.com',
                features: { mentions: true },
            }
        },

        async mentions(params: MentionsParams): Promise<MentionsResult> {
            const query = params.query?.trim()
            const results = query ? await client.search({ text: query }) : client.docs

            console.log('AA', results)

            const mentions: MentionsResult = []
            const seenDocIDs = new Set<DocID>()
            const seenTitles = new Set<string>()
            for (const result of results) {
                const doc = isSearchResult(result) ? client.doc(result.doc) : result
                if (seenDocIDs.has(doc.doc.id)) {
                    continue
                }
                seenDocIDs.add(doc.doc.id)

                // HACK
                if (!doc.content?.title) {
                    continue
                }
                if (seenTitles.has(doc.content?.title)) {
                    continue
                }
                seenTitles.add(doc.content?.title)

                const uri = doc.doc?.url
                if (uri) {
                    mentions.push({
                        title: doc.content?.title || doc.doc?.url || 'Untitled',
                        uri,
                        data: { textContent: doc.content?.textContent },
                    })
                }
            }

            if (mentions.length >= 2) {
                // Trim common suffix (which is often the name of the doc site, like " - My Doc
                // Site").
                const suffix = longestCommonSuffix(mentions.map(r => r.title))
                if (suffix) {
                    for (const r of mentions) {
                        // Don't trim suffix if it would result in an empty or very short string.
                        if (r.title.length >= suffix.length + 10) {
                            r.title = r.title.slice(0, -1 * suffix.length)
                        }
                    }
                }
            }

            // Truncate titles. Do this after trimming common suffixes, or else no common suffix
            // will be found if any titles were truncated.
            for (const r of mentions) {
                r.title = truncate(r.title, 50)
            }

            return mentions
        },

        async items(params: ItemsParams): Promise<ItemsResult> {
            if (params.mention) {
                return [
                    {
                        title: params.mention.title,
                        url: params.mention.uri,
                        ai: { content: params.mention.data?.textContent as string | undefined },
                    },
                ]
            }
            return []
        },
    }
})

function isSearchResult(value: SearchResult | IndexedDoc): value is SearchResult {
    return 'doc' in value && typeof value.doc === 'number'
}

async function fetchIndex(urlStr: string): Promise<CorpusIndex> {
    const url = new URL(urlStr)
    if (url.protocol === 'file:') {
        const { readFile } = require('node:fs/promises')
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
