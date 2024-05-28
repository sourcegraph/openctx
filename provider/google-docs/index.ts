import { readFileSync } from 'fs'
import type { docs_v1 } from '@googleapis/docs'
import type {
    ItemsParams,
    ItemsResult,
    MentionsParams,
    MentionsResult,
    MetaResult,
    Provider,
} from '@openctx/provider'
import type { Credentials } from 'google-auth-library'

/** Settings for the Google Docs OpenCtx provider. */
export type Settings = {
    googleOAuthClientFile?: string
    googleOAuthClient?: {
        client_id: string
        client_secret: string
        redirect_uris: string[]
    }

    googleOAuthCredentialsFile?: string
    googleOAuthCredentials?: Pick<
        Required<Credentials>,
        'access_token' | 'expiry_date' | 'refresh_token'
    >
}

/**
 * An [OpenCtx](https://openctx.org) provider that brings Google Docs context to code AI and
 * editors.
 */
const googleDocs: Provider<Settings> = {
    meta(): MetaResult {
        return { name: 'Google Docs', mentions: {} }
    },

    async mentions(params: MentionsParams, settings: Settings): Promise<MentionsResult> {
        if (!params.query) {
            return []
        }

        const token = await fetchAccessToken(settings)
        const quotedQuery = JSON.stringify(params.query)
        const url = `https://www.googleapis.com/drive/v3/files?q=(name contains ${quotedQuery} or fullText contains ${quotedQuery}) and mimeType = 'application/vnd.google-apps.document'&spaces=drive&corpora=allDrives&includeItemsFromAllDrives=true&supportsAllDrives=true&fields=files(id, name)&pageSize=25`

        const files = await fetchWithAuth(url, token)

        return (files.files ?? []).map((file: any) => ({
            title: `📝 ${file.name!}`,
            // TODO(sqs): un-hardcode
            uri: `https://docs.google.com/document/d/${file.id}/edit`,
        }))
    },

    async items(params: ItemsParams, settings: Settings): Promise<ItemsResult> {
        if (!params.mention) {
            return []
        }

        const documentId = parseDocumentIDFromURL(params.mention.uri)
        if (!documentId) {
            return []
        }

        const token = await fetchAccessToken(settings)
        const url = `https://docs.googleapis.com/v1/documents/${documentId}?fields=body`
        const doc = (await fetchWithAuth(url, token)) as docs_v1.Schema$Document
        const body = doc.body

        return [
            {
                title: params.mention.title,
                url: params.mention.uri,
                ai: {
                    content: body ? convertGoogleDocsBodyToText(body) : undefined,
                },
            },
        ]
    },
}

export default googleDocs

function resolveSettings(settings: Settings): any {
    const googleOAuthClient =
        settings.googleOAuthClient ??
        JSON.parse(
            readFileSync(settings.googleOAuthClientFile ?? process.env.GOOGLE_OAUTH_CLIENT_FILE!, 'utf8')
        ).installed
    if (!googleOAuthClient) {
        throw new Error(
            'must provide a Google OAuth client configuration in the `googleOAuthClient` settings field or a path to a JSON file in the GOOGLE_OAUTH_CLIENT_FILE env var'
        )
    }

    const googleOAuthCredentials =
        settings.googleOAuthCredentials ??
        JSON.parse(
            readFileSync(
                settings.googleOAuthCredentialsFile ?? process.env.GOOGLE_OAUTH_CREDENTIALS_FILE!,
                'utf8'
            )
        )
    if (!googleOAuthCredentials) {
        throw new Error(
            'must provide a Google OAuth credentials configuration in the `googleOAuthCredentials` settings field or a path to a JSON file in the GOOGLE_OAUTH_CREDENTIALS_FILE env var'
        )
    }

    return { ...settings, googleOAuthClient, googleOAuthCredentials }
}

async function fetchAccessToken(settings: Settings): Promise<string> {
    let { access_token, expiry_date } = resolveSettings(settings).googleOAuthCredentials

    if (Date.now() < expiry_date) {
        access_token = await refreshAccessTokenWithFetch(settings)
        // Hacky access_token update for this module.
        settings.googleOAuthCredentials!.access_token = access_token
    }

    return access_token
}

async function fetchWithAuth(url: string, token: string): Promise<any> {
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

    const data = (await response.json()) as any
    return data.access_token
}

function parseDocumentIDFromURL(urlStr: string): string | undefined {
    const url = new URL(urlStr)
    if (url.hostname !== 'docs.google.com') {
        return undefined
    }
    const match = url.pathname.match(/\/d\/([a-zA-Z0-9_-]+)/)
    return match ? match[1] : undefined
}

function convertGoogleDocsBodyToText(body: docs_v1.Schema$Body): string {
    const text: string[] = []
    for (const element of body.content ?? []) {
        if (element.paragraph) {
            for (const paragraphElement of element.paragraph.elements ?? []) {
                // TODO(sqs): only handles text
                if (paragraphElement.textRun?.content) {
                    text.push(paragraphElement.textRun.content)
                }
            }
        }
    }

    return text.join(' ')
}
