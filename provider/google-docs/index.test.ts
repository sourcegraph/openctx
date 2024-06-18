import { describe, expect, test } from 'vitest'
import googleDocs, { type Settings } from './index.js'
import { parseDocumentIDFromURL } from './utils.js'

describe('googleDocs', () => {
    const SETTINGS: Settings = {
        googleOAuthClient: {
            client_id: 'abc123',
            client_secret: 'def456',
            redirect_uris: ['https://example.com/oauth2/callback'],
        },
        googleOAuthCredentials: {
            access_token: 'ghi789',
            expiry_date: '2022-01-01',
            refresh_token: '<PASSWORD>',
        },
    }

    test('meta', async () => {
        expect(await googleDocs.meta({}, SETTINGS)).toStrictEqual({
            name: 'Google Docs',
            mentions: { label: 'Search by title or paste a URL...' },
        })
    })
})

describe('parseDocumentIDFromURL', () => {
    test('parses valid Google Docs URL', () => {
        const id = parseDocumentIDFromURL('https://docs.google.com/document/d/abc123_/edit')
        expect(id).toBe('abc123_')
    })

    test('returns undefined for non-Google Docs URL', () => {
        const id = parseDocumentIDFromURL('https://example.com/doc/123')
        expect(id).toBeUndefined()
    })

    test('returns undefined for invalid Google Docs URL', () => {
        const id = parseDocumentIDFromURL('https://docs.google.com/document')
        expect(id).toBeUndefined()
    })

    test('returns undefined for Google Docs URL with invalid doc ID', () => {
        const id = parseDocumentIDFromURL('https://docs.google.com/document/d/!nv@lid/')
        expect(id).toBeUndefined()
    })
})
