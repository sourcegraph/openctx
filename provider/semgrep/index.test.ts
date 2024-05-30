import type { ItemsParams } from '@openctx/provider'
import 'dotenv/config'
import { beforeEach, describe, expect, test } from 'vitest'

import { urlfor } from './api.js'
import API from './client.js'
import semgrep from './index.js'

import type { Finding, Findings } from './api.js'
import type { Settings } from './index.js'

describe('Semgrep provider', () => {
    let client: API
    let findings: Findings
    let SETTINGS: Settings

    beforeEach(async () => {
        SETTINGS = {
            repo: process.env.SEMGREP_SCAN_REPO || '',
            token: process.env.SEMGREP_APP_TOKEN || '',
            deployment: process.env.SEMGREP_DEPLOYMENT || '',
        }
        client = new API(SETTINGS)
        findings = await client.findings(67557107)
    })

    test('meta', () => {
        const meta = semgrep.meta({}, SETTINGS)

        expect(meta).toBeDefined()
        expect(meta).toEqual({ name: 'Semgrep', annotations: {}, mentions: {} })
    })

    test('items', () => {
        const f: Finding = findings.pop() as Finding
        const p: ItemsParams = {
            mention: {
                title: f.rule_name,
                data: { finding: f },
                uri: urlfor(SETTINGS.deployment, f.repository.name, f.id),
            },
        }

        const items = semgrep.items ? semgrep.items(p, SETTINGS) : []
        for (const item of items) {
            expect(item).toBeDefined()
            expect(Object.keys(item)).toEqual(['title', 'ai', 'ui', 'url'])
        }
    })

    test('mentions', async () => {
        let p = { query: 'https://semgrep.dev/orgs/tinvaan/findings/67557103' }
        let mentions = semgrep.mentions ? await semgrep.mentions(p, SETTINGS) : []
        for (const mention of mentions) {
            expect(Object.keys(mention)).toEqual(['title', 'data', 'uri'])
        }

        p = { query: 'lorem ipsum dolor si amet' }
        const mx = async () => {
            mentions = semgrep.mentions ? await semgrep.mentions(p, SETTINGS) : []
        }
        expect(mentions).toThrow(TypeError)
    })
})
