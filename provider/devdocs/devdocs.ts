import fs from 'node:fs/promises'
import url from 'node:url'

/** Format of the file found at a location like https://devdocs.io/docs/go/index.json */
interface Index {
    entries: {
        /** @example "adler32.Checksum()" */
        name: string
        /** @example "hash/adler32/index#Checksum" */
        path: string
        /** @example "hash" */
        type: string
    }[]
    types: {
        /** @example "archive" */
        name: string
        /** @example 56 */
        count: number
        /** @example "archive" */
        slug: string
    }[]
}

export async function fetchIndex(devdocsURL: string): Promise<Index> {
    const baseURL = new URL(devdocsURL)
    if (baseURL.protocol === 'file:') {
        const indexURL = new URL('index.json', baseURL)
        return JSON.parse(await fs.readFile(url.fileURLToPath(indexURL), 'utf8'))
    }

    // Transform path of baseURL from /{slug}/ to /docs/{slug}/index.json
    const indexURL = new URL(`${baseURL.pathname}index.json`, baseURL)
    indexURL.host = 'documents.devdocs.io' // this subdomain allows cross-origin requests
    const response = await fetch(indexURL.toString())
    const index = JSON.parse(await response.text())

    return index
}

export async function fetchDoc(docURL: string): Promise<{ content: string; hash: string }> {
    const contentURL = new URL(docURL)
    contentURL.pathname = contentURL.pathname + '.html'

    const hash = contentURL.hash
    contentURL.hash = ''

    if (contentURL.protocol === 'file:') {
        return { hash, content: await fs.readFile(url.fileURLToPath(contentURL), 'utf8') }
    }

    // Needs to be translated into something like https://documents.devdocs.io/go/hash/adler32/index.html
    contentURL.host = 'documents.devdocs.io'

    const response = await fetch(contentURL.toString())
    return { hash, content: await response.text() }
}
