import { describe, expect, test } from 'vitest'
import googleDocs, { type Settings } from './index'

describe('googleDocs', () => {
    const SETTINGS: Settings = {}

    test('capabilities', async () => {
        expect(await googleDocs.capabilities({}, SETTINGS)).toEqual({ meta: { name: 'Google Docs' } })
    })
})
