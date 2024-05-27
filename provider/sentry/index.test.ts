
import 'dotenv/config'
import { MetaResult } from '@openctx/provider'
import { describe, expect, test } from 'vitest'

import sentry, { type Settings } from './index.js'


describe('sentry', () => {
    const META: MetaResult = {
        selector: [],
        name: 'Sentry',
        features: { mentions: true }
    }
    const SETTINGS: Settings = {
        token: process.env.SENTRY_AUTH_TOKEN || 'null',
        project: process.env.SENTRY_PROJ_SLUG || 'null',
        organization: process.env.SENTRY_ORG_SLUG || 'null'
    }

    test('meta', () => {
        let result = sentry.meta({}, SETTINGS)
        expect(result).toBeDefined()
        expect(result).toEqual(META)

        result = sentry.meta({}, {token: 'foobar', project: 'barfoo', organization: 'test'})
        expect(result).toBeDefined()
        expect(result).toEqual(META)
    })

    test('annotations', () => {
        // TODO
    })
})