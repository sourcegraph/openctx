import { readFileSync } from 'fs'
import { auth, docs as googleDocsAPI, type docs_v1 } from '@googleapis/docs'
import { drive as googleDriveAPI } from '@googleapis/drive'
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
    googleOAuthCredentials?: Credentials
}

/**
 * An [OpenCtx](https://openctx.org) provider that brings Google Docs context to code AI and
 * editors.
 */
const googleDocs: Provider<Settings> = {
    meta(): MetaResult {
        return { name: 'Google Docs' }
    },

    async mentions(params: MentionsParams, settingsInput: Settings): Promise<MentionsResult> {
        if (!params.query) {
            return []
        }

        const oauth2Client = resolveOAuth2Client(settingsInput)
        const driveAPI = googleDriveAPI({ version: 'v3', auth: oauth2Client })

        const quotedQuery = JSON.stringify(params.query)
        const files = await driveAPI.files.list({
            q: `(name contains ${quotedQuery} or fullText contains ${quotedQuery}) and mimeType = 'application/vnd.google-apps.document'`,
            spaces: 'drive',
            corpora: 'allDrives',
            includeItemsFromAllDrives: true,
            supportsAllDrives: true,
            fields: 'files(id, name)',
            pageSize: 25,
        })

        return (files.data.files ?? []).map(file => ({
            title: `📝 ${file.name!}`,
            // TODO(sqs): un-hardcode
            uri: `https://docs.google.com/document/d/${file.id}/edit`,
        }))
    },

    async items(params: ItemsParams, settingsInput: Settings): Promise<ItemsResult> {
        if (!params.mention) {
            return []
        }

        const documentId = parseDocumentIDFromURL(params.mention.uri)
        if (!documentId) {
            return []
        }

        const oauth2Client = resolveOAuth2Client(settingsInput)
        const docsAPI = googleDocsAPI({ version: 'v1', auth: oauth2Client })

        const doc = await docsAPI.documents.get({
            documentId,
            fields: 'body',
        })
        const body = doc.data.body
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

function resolveOAuth2Client(settingsInput: Settings) {
    const settings = resolveSettings(settingsInput)

    const oauth2Client = new auth.OAuth2({
        clientId: settings.googleOAuthClient?.client_id,
        clientSecret: settings.googleOAuthClient?.client_secret,
        redirectUri: settings.googleOAuthClient?.redirect_uris[0],
    })
    oauth2Client.setCredentials(settings.googleOAuthCredentials)

    return oauth2Client
}

interface ResolvedSettings
    extends Required<Pick<Settings, 'googleOAuthClient' | 'googleOAuthCredentials'>> {}

function resolveSettings(settings: Settings): ResolvedSettings {
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

export function parseDocumentIDFromURL(urlStr: string): string | undefined {
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
