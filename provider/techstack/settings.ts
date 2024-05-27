
import YAML from 'yaml'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'


import type TSF from './techstack.schema.js'


export function urlread(uri: string): string {
    const url = new URL(uri)
    if (url.protocol === 'file:') {
        return fileURLToPath(url)
    }

    if (url.protocol === 'http:' || url.protocol === 'https:') {
        if (typeof window === 'undefined') {
            throw new URIError(`${url.protocol} urls are not supported in current environment`)
        }
        return uri
    }

    throw new URIError(`${url.protocol} urls not supported`)
}

/**
 * Read the techstack file configuration for project
 *
 * @param fileUri - absolute path of techstack yml file
 * @returns parsed yaml object
 */
export default async function load(fileUri: string): Promise<TSF> {
    let content
    const uri = urlread(fileUri)

    if (typeof window === 'undefined') {
        content = readFileSync(uri, 'utf-8')
    } else {
        // Browser
        const r: Response = await fetch(fileUri)
        if (r.status !== 200) {
            console.error(`Techstack: failed to fetch settings from ${fileUri}`)
            return {} as TSF
        }
        content = await r.text()
    }

    return YAML.parse(content)
}