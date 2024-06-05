import type { Settings } from './index.ts'

const authHeaders = (settings: Settings) => ({
    Authorization: `Basic ${Buffer.from(`${settings.email}:${settings.apiToken}`).toString('base64')}`,
})

const endpoint = (settings: Settings) =>
    'https://' + settings.host + (settings.port ? `:${settings.port}` : '')

export interface Page {
    title: string
    body: string
    space: {
        name: string
    }
    uri: string
}

interface PagesSearchJSON {
    results: {
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
    }[]
}

const escapeCqlQuotes = (input: string) => input.replace(/"/g, '\\"')

export const listPages = async (settings: Settings, query?: string): Promise<Page[]> => {
    const titleQuery = query ? `title ~ "${escapeCqlQuotes(query)}*"` : 'title ~ "*"'

    const response = await fetch(
        `${endpoint(settings)}/wiki/rest/api/content/search?cql=${encodeURIComponent(
            `type=page AND ${titleQuery} ORDER BY created DESC, title`
        )}&expand=space,body.storage.value`,
        {
            method: 'GET',
            headers: authHeaders(settings),
        }
    )

    if (!response.ok) {
        throw new Error(
            `Error searching content (${response.status} ${
                response.statusText
            }): ${await response.text()}`
        )
    }

    const json = (await response.json()) as PagesSearchJSON

    // Uncomment to debug
    // console.dir(json, { depth: 10 })

    return json.results.map(page => ({
        title: page.title,
        space: { name: page.space.name },
        body: page.body.storage.value,
        uri: `${endpoint(settings)}/wiki${page._links.webui}`,
    }))
}
