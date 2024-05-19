import { describe, expect, test } from 'vitest'
import googleDocs, { type Settings } from './index.js'

describe('googleDocs', () => {
    const SETTINGS: Settings = {}

    test('meta', async () => {
        expect(await googleDocs.meta({}, SETTINGS)).toEqual({ meta: { name: 'Google Docs' } })
    })
})
