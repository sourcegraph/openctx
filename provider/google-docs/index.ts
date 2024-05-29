import type { docs_v1 } from '@googleapis/docs'
import type {
    ItemsParams,
    ItemsResult,
    MentionsParams,
    MentionsResult,
    MetaResult,
    Provider,
} from '@openctx/provider'
import { fetchWithAuth, recentDocsUrl, searchDocsUrl } from './api.js'
import { parseDocumentIDFromURL } from './utils.js'

/** Settings for the Google Docs OpenCtx provider. */
export type Settings = {
    googleOAuthClient: {
        client_id: string
        client_secret: string
        redirect_uris: string[]
    }
    googleOAuthCredentials: {
        access_token: string
        expiry_date: string
        refresh_token: string
    }
}

const NUMBER_OF_DOCUMENTS_TO_FETCH = 10

/**
 * An [OpenCtx](https://openctx.org) provider that brings Google Docs context to code AI and
 * editors.
 */
const googleDocs: Provider<Settings> = {
    meta(): MetaResult {
        return { name: 'Google Docs', mentions: {} }
    },

    async mentions(params: MentionsParams, settings: Settings): Promise<MentionsResult> {
        const url = params.query
            ? searchDocsUrl(NUMBER_OF_DOCUMENTS_TO_FETCH, JSON.stringify(params.query))
            : recentDocsUrl(NUMBER_OF_DOCUMENTS_TO_FETCH)

        const response = await fetchWithAuth(url, settings)

        return (response.files ?? []).map((file: any) => ({
            title: file.name,
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

        const url = `https://docs.googleapis.com/v1/documents/${documentId}?fields=body`
        const doc = (await fetchWithAuth(url, settings)) as docs_v1.Schema$Document
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
