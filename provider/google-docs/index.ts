import { readFileSync } from 'fs'
import { auth, docs as googleDocsAPI, type docs_v1 } from '@googleapis/docs'
import { drive as googleDriveAPI } from '@googleapis/drive'
import type { Item, ItemsParams, ItemsResult, MetaResult, Provider } from '@openctx/provider'
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

    async items(params: ItemsParams, settingsInput: Settings): Promise<ItemsResult> {
        const settings = resolveSettings(settingsInput)

        const oauth2Client = new auth.OAuth2({
            clientId: settings.googleOAuthClient?.client_id,
            clientSecret: settings.googleOAuthClient?.client_secret,
            redirectUri: settings.googleOAuthClient?.redirect_uris[0],
        })
        oauth2Client.setCredentials(settings.googleOAuthCredentials)
        const docsAPI = googleDocsAPI({ version: 'v1', auth: oauth2Client })
        const driveAPI = googleDriveAPI({ version: 'v3', auth: oauth2Client })

        const quotedQuery = JSON.stringify(params.message)
        const files = await driveAPI.files.list({
            q: `(name contains ${quotedQuery} or fullText contains ${quotedQuery}) and mimeType = 'application/vnd.google-apps.document'`,
            spaces: 'drive',
            corpora: 'allDrives',
            includeItemsFromAllDrives: true,
            supportsAllDrives: true,
            fields: 'files(id, name)',
            pageSize: 25,
        })

        const items: Item[] = []
        await Promise.all(
            (files.data.files ?? []).map(async file => {
                const doc = await docsAPI.documents.get({
                    documentId: file.id!,
                    fields: 'documentId,title,body',
                })
                const body = doc.data.body
                items.push({
                    title: `📝 ${file.name!}`,
                    // TODO(sqs): un-hardcode
                    url: `https://docs.google.com/document/d/${doc.data.documentId}/edit`,
                    ai: {
                        content: body ? convertGoogleDocsBodyToText(body) : undefined,
                    },
                })
            })
        )
        return items
    },
}

export default googleDocs

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
