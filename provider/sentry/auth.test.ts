import { describe, expect, test } from 'vitest'
import { getSentryAccessToken } from './auth.js'

describe('getSentryAccessToken', () => {
    test('returns apiToken when provided', async () => {
        const settings = { apiToken: 'abc123' }
        const token = await getSentryAccessToken(settings)
        expect(token).toBe('abc123')
    })

    test('returns null when no apiToken or apiTokenPath provided', async () => {
        const settings = {}
        const token = await getSentryAccessToken(settings)
        expect(token).toBeNull()
    })
})
