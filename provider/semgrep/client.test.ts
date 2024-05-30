import 'dotenv/config'
import { beforeEach, describe, expect, test } from 'vitest'

import type { Findings } from './api.js'
import API from './client.js'
import type { Settings } from './index.js'

describe('Semgrep client', () => {
    let client: API
    let defaults: Settings

    beforeEach(() => {
        defaults = {
            token: process.env.SEMGREP_APP_TOKEN || '',
            repo: process.env.SEMGREP_SCAN_REPO || 'openctx',
            deployment: process.env.SEMGREP_DEPLOYMENT || '',
        }
        client = new API(defaults)
    })

    test('fetch all findings for a deployment', async () => {
        defaults.repo = ''
        client = new API(defaults)

        const finds: Findings = await client.findings()
        expect(finds).toBeDefined()
    })

    test('fetch all findings for a repository', async () => {
        const finds: Findings = await client.findings()

        expect(finds).toBeDefined()
        for (const f of finds) {
            expect(f.repository.name).toEqual(defaults.repo)
        }
    })

    test('fetch a requested finding', async () => {
        client = new API(defaults)
        const finds: Findings = await client.findings(67557107)
        expect(finds).toBeDefined()
    })
})
