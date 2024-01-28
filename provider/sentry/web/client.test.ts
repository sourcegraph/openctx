
import { describe, expect, test } from 'vitest'

import { Sentry } from './client'
import { type Settings } from '../index'


describe('sentry client', () => {
    const SETTINGS: Settings = {
        project: process.env.SENTRY_PROJ_ID || 'null',
        token: process.env.SENTRY_AUTH_TOKEN || 'null',
        organization: process.env.SENTRY_ORG_SLUG || 'null'
    }
    const client: Sentry = new Sentry(SETTINGS)

    test('organization', async () => {
        let org = await client.organization(SETTINGS.token)
        expect(org).toBeUndefined()

        org = await client.organization(SETTINGS.organization)
        expect(org).toBeDefined()
    })

    test('project', async () => {
        let proj = await client.project(SETTINGS.organization, SETTINGS.token)
        expect(proj).toBeUndefined()

        proj = await client.project(SETTINGS.token, SETTINGS.project)
        expect(proj).toBeUndefined()

        proj = await client.project(SETTINGS.organization, SETTINGS.project)
        expect(proj).toBeDefined()
    })

    test('issues', async () => {
        let issues = await client.issues(SETTINGS.token, SETTINGS.project)
        expect(issues).toBeUndefined()

        issues = await client.issues(SETTINGS.organization, SETTINGS.token)
        expect(issues).toBeUndefined()

        issues = await client.issues(SETTINGS.organization, SETTINGS.project)
        expect(issues).toBeDefined()
    })
})
