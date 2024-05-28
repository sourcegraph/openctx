
import 'dotenv/config'
import { beforeEach, describe, expect, test } from 'vitest'

import API from './client.js'
import type { Settings } from './index.js'
import type { Finding, Findings } from './api.js'


describe('Semgrep client', () => {
    let client: API, defaults: Settings

    beforeEach(() => {
        defaults = {
            token: process.env.SEMGREP_APP_TOKEN || '',
            repo: process.env.SEMGREP_SCAN_REPO || 'openctx',
            deployment: process.env.SEMGREP_DEPLOYMENT || ''
        }
        client = new API(defaults)
    })

    test('fetch all findings for a deployment', async () => {
        defaults.repo = ''
        client = new API(defaults)

        let finds: Findings = await client.findings()
        expect(finds).toBeDefined()
    })

    test('fetch all findings for a repository', async() => {
        let finds: Findings = await client.findings()

        expect(finds).toBeDefined()
        finds.forEach(f => {
            expect(f.repository.name).toEqual(defaults.repo)
        })
    })

    test('fetch a requested finding', async () => {
        client = new API(defaults)
        let finds: Findings = await client.findings(67557107)
        expect(finds).toBeDefined()
    })
})
