import { readFileSync } from 'node:fs'
import type {
    ItemsParams,
    ItemsResult,
    MentionsParams,
    MentionsResult,
    MetaResult,
    Provider,
} from '@openctx/provider'
import dedent from 'dedent'
import { XMLBuilder } from 'fast-xml-parser'

import type { UserCredentials } from './auth.js'

/** Settings for the Linear Docs OpenCtx provider. */
export type Settings = {
    userCredentialsPath?: string
    accessToken?: string
}

const xmlBuilder = new XMLBuilder({ format: true })

interface Document {
    id: string
    title: string
    url: string
    content?: string
}

const NUMBER_OF_DOCS_TO_FETCH = 10

const linearDocs: Provider<Settings> = {
    meta(): MetaResult {
        return { name: 'Linear Docs', mentions: {} }
    },

    async mentions(params: MentionsParams, settingsInput: Settings): Promise<MentionsResult> {
        let docs: Document[] = []

        if (params.query) {
            const variables = { term: params.query, first: NUMBER_OF_DOCS_TO_FETCH }
            const response = await linearApiRequest(documentSearchQuery, variables, settingsInput)
            docs = response.data.searchDocuments.nodes as Document[]
        } else {
            const variables = { first: NUMBER_OF_DOCS_TO_FETCH }
            const response = await linearApiRequest(recentDocumentsQuery, variables, settingsInput)
            docs = response.data.documents.nodes as Document[]
        }

        const mentions = (docs ?? []).map(doc => ({
            title: doc.title,
            uri: doc.url,
        }))

        return mentions
    },

    async items(params: ItemsParams, settingsInput: Settings): Promise<ItemsResult> {
        if (!params.mention) {
            return []
        }

        const documentId = parseDocumentIDFromURL(params.mention.uri)
        if (!documentId) {
            return []
        }

        const variables = { id: documentId }
        const response = await linearApiRequest(documentWithContentQuery, variables, settingsInput)
        const document = response.data.document as Document

        const documentInfo = xmlBuilder.build({
            title: document.title,
            content: document.content || '',
            url: document.url,
        })
        const content = dedent`
            Here is the Linear document. Use it to check if it helps.
            Ignore it if it is not relevant.

            ${documentInfo}
        `

        return [
            {
                title: document.title,
                url: document.url,
                ai: {
                    content,
                },
            },
        ]
    },
}

export default linearDocs

function getAccessToken(settings: Settings): string {
    if (settings?.accessToken) {
        return settings.accessToken
    }

    if (settings.userCredentialsPath) {
        const userCredentialsString = readFileSync(settings.userCredentialsPath, 'utf-8')
        const userCredentials = JSON.parse(userCredentialsString) as Partial<UserCredentials>

        if (!userCredentials.access_token) {
            throw new Error(`access_token not found in ${settings.userCredentialsPath}`)
        }

        return userCredentials.access_token
    }

    throw new Error(
        'must provide a Linear user credentials path in the `userCredentialsPath` settings field or an accessToken in the linearClientOptions'
    )
}

async function linearApiRequest(
    query: string,
    variables: object,
    settings: Settings
): Promise<{ data: any }> {
    const accessToken = getAccessToken(settings)
    const response = await fetch('https://api.linear.app/graphql', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ query, variables }),
    })

    if (!response.ok) {
        const errorBody = await response.text()
        console.error(
            `Linear API request failed: ${response.status} - ${response.statusText}\n${errorBody}`
        )
        throw new Error(`Linear API request failed: ${response.statusText}`)
    }

    const json = (await response.json()) as { data: object }

    if (!json.data) {
        throw new Error('Linear API request failed: no data')
    }

    return json
}

function parseDocumentIDFromURL(urlStr: string): string | undefined {
    const url = new URL(urlStr)
    if (!url.hostname.endsWith('linear.app')) {
        return undefined
    }
    const match = url.pathname.match(/\/document\/.+-([a-zA-Z0-9]+)$/)
    return match ? match[1] : undefined
}

const recentDocumentsQuery = `
  query RecentDocuments($first: Int!) {
    documents(first: $first, orderBy: updatedAt) {
        nodes {
          id
          title
          url
        }
    }
  }
`
const documentSearchQuery = `
    query DocumentSearch($term: String!, $first: Int!) {
        searchDocuments(term: $term, first: $first, orderBy: updatedAt) {
            nodes {
              id
              title
              url
            }
        }
    }
`
const documentWithContentQuery = `
  query DocumentWithContent($id: String!) {
    document(id: $id) {
      id
      title
      url
      content
    }
  }
`
