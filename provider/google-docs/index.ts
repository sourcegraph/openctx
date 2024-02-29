import { docs as googleDocsAPI,auth } from '@googleapis/docs'
import { drive as googleDriveAPI } from '@googleapis/drive'
import type { CapabilitiesResult, Item, ItemsParams, ItemsResult, Provider } from '@openctx/provider'

/** Settings for the Google Docs OpenCtx provider. */
export type Settings = {
    apiKey?: string
}

const x = new auth.OAuth2({})

/**
 * An [OpenCtx](https://openctx.org) provider that brings Google Docs context to code AI and
 * editors.
 */
const googleDocs: Provider<Settings> = {
    capabilities(): CapabilitiesResult {
        return {}
    },

    async items(params: ItemsParams, settings: Settings): Promise<ItemsResult> {
        settings = resolveSettings(settings)

        const docsAPI = googleDocsAPI({ version: 'v1', auth: settings.apiKey })
        const driveAPI = googleDriveAPI({ version: 'v3', auth:  })

        const quotedQuery = JSON.stringify(params.query)
        const files = await driveAPI.files.list({
            q: `(name contains ${quotedQuery} or fullText contains ${quotedQuery}) and mimeType = 'application/vnd.google-apps.document'`,
            spaces: 'drive',
            corpora: 'allDrives',
            includeItemsFromAllDrives: true,
            supportsAllDrives: true,
            fields: 'items(id,name)',
            pageSize: 10,
        })

        const items: Item[] = []
        await Promise.all(
            (files.data.files ?? []).map(async file => {
                const doc = await docsAPI.documents.get({
                    documentId: file.id!,
                    fields: 'title,body',
                })
                const body = doc.data.body
                console.error('XX', { title: doc.data.title, name: file.name, body })
                items.push({
                    title: file.name!,
                    url: file.webViewLink!,
                    ai: {
                        content: 'aa',
                    },
                })
            })
        )
        return items
    },
}

export default googleDocs

function resolveSettings(settings: Settings): Required<Settings> {
    const apiKey = settings.apiKey ?? process.env.GOOGLE_API_KEY
    if (!apiKey) {
        throw new Error('must provide a Google API key in the `apiKey` settings field')
    }
    return { ...settings, apiKey }
}
