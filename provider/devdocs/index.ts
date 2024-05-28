import type {
    ItemsParams,
    ItemsResult,
    MentionsParams,
    MentionsResult,
    MetaResult,
    Provider,
} from '@openctx/provider'
import Fuse from 'fuse.js'
import { LRUCache } from 'lru-cache'
import { parse } from 'node-html-parser'
import { fetchDoc, fetchIndex } from './devdocs.js'

const DEFAULT_URLS = [
    'https://devdocs.io/css/',
    'https://devdocs.io/html/',
    'https://devdocs.io/http/',
    'https://devdocs.io/javascript/',
    'https://devdocs.io/dom/',
]

/**
 * Settings for the DevDocs OpenCtx provider.
 */
export type Settings = {
    /**
     * The list of URLs to serve. Defaults to DEFAULT_URLS.
     *
     * These should be top-level documentation URLs like https://devdocs.io/angular~16/ or https://devdocs.io/typescript/
     *
     * Additionally this supports file:// URLs for local development.
     */
    urls?: string[]
}

/**
 * An OpenCtx provider that fetches the content of a [DevDocs](https://devdocs.io/) entry.
 */
const devdocs: Provider<Settings> = {
    meta(): MetaResult {
        return {
            name: 'DevDocs',
            mentions: {},
        }
    },

    async mentions(params: MentionsParams, settings: Settings): Promise<MentionsResult> {
        const query = params.query?.toLowerCase()
        if (!query) {
            return []
        }

        const urls = settings.urls ?? DEFAULT_URLS

        const indexes = await Promise.all(urls.map(url => getMentionIndex(url)))
        const entries = indexes.flatMap(index => {
            return index.fuse.search(query, { limit: 10 }).map(result => ({
                score: result.score ?? 0,
                item: result.item,
                url: index.url,
            }))
        })

        entries.sort((a, b) => a.score - b.score)

        return entries.slice(0, 20).map(entry => {
            return {
                title: entry.item.name,
                uri: new URL(entry.item.path, entry.url).toString(),
            }
        })
    },

    async items(params: ItemsParams): Promise<ItemsResult> {
        const mention = params.mention
        if (!mention) {
            return []
        }

        const { content, hash } = await fetchDoc(mention.uri)
        if (!hash) {
            return [
                {
                    title: mention.title,
                    url: mention.uri,
                    ai: {
                        content: content,
                    },
                },
            ]
        }

        const root = parse(content)

        let last = root.querySelector(hash)!
        const nodes = [last]
        while (true) {
            const next = last.nextElementSibling
            if (!next || next.rawTagName === 'h2') {
                break
            }
            last = next
            nodes.push(last)
        }

        return [
            {
                title: mention.title,
                url: mention.uri,
                ai: {
                    content: nodes.map(node => node.toString()).join(''),
                },
            },
        ]
    },
}

// Use cache to avoid refetching index on each request.
const cache = new LRUCache<string, MentionIndex>({
    ttl: 1000 * 60 * 60 * 12, // 12 hours
    ttlAutopurge: true,
})

interface MentionIndex {
    // The normalized devdocs URL
    url: string
    // A fuzzy finder index. We use this to help return the best match when
    // there are many.
    fuse: Fuse<{ name: string; path: string }>
}

async function getMentionIndex(devdocsURL: string): Promise<MentionIndex> {
    // ensure urls end with / to ensure we treat path as a dir when creating new relative paths.
    if (!devdocsURL.endsWith('/')) {
        devdocsURL = devdocsURL + '/'
    }

    if (cache.has(devdocsURL)) {
        return cache.get(devdocsURL)!
    }

    const index = await fetchIndex(devdocsURL)
    const entries = index.entries.map(entry => ({
        name: entry.name,
        path: entry.path,
    }))

    const options = {
        includeScore: true,
        keys: ['name'],
    }
    const fuse = new Fuse(entries, options)

    const result = {
        url: devdocsURL,
        fuse,
    }
    cache.set(devdocsURL, result)

    return result
}

export default devdocs
