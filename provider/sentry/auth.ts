import { readFile } from 'node:fs/promises'
import type { Settings } from './settings.js'

/**
 * getSentryAccessToken retrieves a sentry access token from the config, or null
 * if nothing was configured.
 */
export async function getSentryAccessToken(settings: Settings): Promise<string | null> {
    if (settings.apiToken) {
        return settings.apiToken
    }

    if (settings.apiTokenPath) {
        const content = await readFile(settings.apiTokenPath, 'utf-8')
        return content
    }

    return null
}
