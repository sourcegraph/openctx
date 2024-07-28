import type { Settings } from './index.js'

export const recentDocsUrl = (pageSize: number): string =>
    `https://www.googleapis.com/drive/v3/files?q=mimeType='application/vnd.google-apps.document'&orderBy=modifiedTime desc&spaces=drive&corpora=user&includeItemsFromAllDrives=true&supportsAllDrives=true&fields=files(id, name)&pageSize=${pageSize}`

export const searchDocsUrl = (pageSize: number, quotedQuery: string): string =>
    `https://www.googleapis.com/drive/v3/files?q=(name contains ${quotedQuery} or fullText contains ${quotedQuery}) and mimeType = 'application/vnd.google-apps.document'&spaces=drive&corpora=allDrives&includeItemsFromAllDrives=true&supportsAllDrives=true&fields=files(id, name)&pageSize=${pageSize}`

function validateSettings(settings: Settings): Required<Settings> {
    const googleOAuthClient = settings.googleOAuthClient
    if (!googleOAuthClient) {
        throw new Error(
            'must provide a Google OAuth client configuration in the `googleOAuthClient` settings field',
        )
    }

    const googleOAuthCredentials = settings.googleOAuthCredentials
    if (!googleOAuthCredentials) {
        throw new Error(
            'must provide a Google OAuth credentials configuration in the `googleOAuthCredentials` settings field',
        )
    }

    return { ...settings, googleOAuthClient, googleOAuthCredentials }
}

async function fetchAccessToken(settings: Settings): Promise<string> {
    let { access_token, expiry_date } = validateSettings(settings).googleOAuthCredentials

    if (Date.now() >= Number(expiry_date)) {
        access_token = await refreshAccessTokenWithFetch(settings)
        // Hacky access_token update for this module.
        settings.googleOAuthCredentials!.access_token = access_token
    }

    return access_token
}

export async function fetchWithAuth(url: string, settings: Settings): Promise<any> {
    const token = await fetchAccessToken(settings)

    const response = await fetch(url, {
        headers: {
            Authorization: `Bearer ${token}`,
        },
    })
    if (!response.ok) {
        const errorBody = await response.text()
        console.error(`Failed to fetch: ${response.status} - ${response.statusText}\n${errorBody}`)
        throw new Error(`Failed to fetch: ${response.statusText}`)
    }

    return response.json()
}

async function refreshAccessTokenWithFetch(settings: Settings): Promise<string> {
    const response = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
            client_id: settings.googleOAuthClient!.client_id,
            client_secret: settings.googleOAuthClient!.client_secret,
            refresh_token: settings.googleOAuthCredentials!.refresh_token!,
            grant_type: 'refresh_token',
        }),
    })

    if (!response.ok) {
        throw new Error('Failed to refresh access token')
    }

    const data = (await response.json()) as { access_token: string }
    return data.access_token
}
