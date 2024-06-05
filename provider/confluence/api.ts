import type { Settings } from './index.ts'

const authHeaders = (settings: Settings) => ({
    Authorization: `Basic ${Buffer.from(`${settings.email}:${settings.apiToken}`).toString('base64')}`,
})

const buildUrl = (settings: Settings, path: string, searchParams: Record<string, string> = {}) => {
    const url = new URL(settings.url.replace(/\/$/, '') + path)
    url.search = new URLSearchParams(searchParams).toString()
    return url
}

export interface PageSearchResult {
    id: string
    title: string
    space: {
        name: string
    }
    uri: string
}

interface PagesSearchJSON {
    results: {
        id: string
        title: string
        space: {
            name: string
        }
        _links: {
            webui: string
        }
    }[]
}

export interface Page {
    id: string
    title: string
    space: {
        name: string
    }
    body: string
    uri: string
}

interface PageJSON {
    id: string
    title: string
    space: {
        name: string
    }
    body: {
        storage: {
            value: string
        }
    }
    _links: {
        webui: string
    }
}

export const listPages = async (settings: Settings, query?: string): Promise<PageSearchResult[]> => {
    const url = buildUrl(settings, '/rest/api/content/search', {
        cql: `type=page AND ${
            query ? `title ~ ${JSON.stringify(query + '*')}` : 'title ~ "*"'
        } ORDER BY created DESC, title`,
        expand: 'space',
    })

    const response = await fetch(url, {
        method: 'GET',
        headers: authHeaders(settings),
    })

    if (!response.ok) {
        throw new Error(
            `Error searching content (${response.status} ${
                response.statusText
            }): ${await response.text()}`
        )
    }

    const json = (await response.json()) as PagesSearchJSON

    // Uncomment to debug
    // console.dir(json, { depth: null })

    return json.results.map(page => ({
        id: page.id,
        title: page.title,
        space: { name: page.space.name },
        uri: buildUrl(settings, page._links.webui).toString(),
    }))
}

export const getPage = async (settings: Settings, id: string): Promise<Page> => {
    const url = buildUrl(settings, `/rest/api/content/${id}`, {
        expand: 'space,body.storage.value',
    })

    const response = await fetch(url, {
        method: 'GET',
        headers: authHeaders(settings),
    })

    if (!response.ok) {
        throw new Error(
            `Error getting content (${response.status} ${response.statusText}): ${await response.text()}`
        )
    }

    const json = (await response.json()) as PageJSON

    // Uncomment to debug
    // console.dir(json, { depth: null })

    return {
        id: json.id,
        title: json.title,
        space: { name: json.space.name },
        body: json.body.storage.value,
        uri: buildUrl(settings, json._links.webui).toString(),
    }
}
