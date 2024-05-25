
import 'dotenv/config'
import { describe, expect, test } from 'vitest'

import sentry, { type Settings } from './index'


describe('sentry', () => {
    const SETTINGS: Settings = {
        token: process.env.SENTRY_AUTH_TOKEN || 'null',
        project: process.env.SENTRY_PROJ_SLUG || 'null',
        organization: process.env.SENTRY_ORG_SLUG || 'null'
    }

    test('capabilities', () => {
        let result = sentry.capabilities({}, SETTINGS)
        expect(result).toBeDefined()

        result = sentry.capabilities({}, {token: 'foobar', project: 'barfoo', organization: 'test'})
        expect(result).toBeDefined()
    })

    test('annotations', () => {

    })
})