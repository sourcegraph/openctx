import { describe, expect, test } from 'vitest'

import type { ItemsParams, ItemsResult } from '@openctx/provider'

import { urlfor } from './api.js'
import API from './client.js'
import semgrep from './index.js'
import findings from './mocks/findings.js'

import type { Finding, Findings } from './api.js'
import type { Settings } from './index.js'

describe('Semgrep provider', () => {
    let found: Findings

    const client: API = new API({
        repo: 'opencodegraph',
        deployment: 'sourcegraph',
        token: 'foobarbazfoobarbazbarfoobaz',
    })
    const apiUrl: string = 'https://semgrep.dev/api/v1'
    const settings: Settings = client.settings()

    test('meta', () => {
        const meta = semgrep.meta({}, settings)

        expect(meta).toBeDefined()
        expect(meta).toEqual({ name: 'Semgrep', annotations: {}, mentions: {} })
    })

    test('items', async () => {
        findings.mock(apiUrl, settings).persist()
        found = await client.findings(67557107)

        const f: Finding = found.pop() as Finding
        const p: ItemsParams = {
            mention: {
                title: f.rule_name,
                data: { finding: f },
                uri: urlfor(settings.deployment, f.repository.name, f.id),
            },
        }

        const items = (semgrep.items ? semgrep.items(p, settings) : []) as ItemsResult
        for (const item of items) {
            expect(item).toBeDefined()
            expect(Object.keys(item)).toEqual(['title', 'ai', 'ui', 'url'])
        }
    })

    test('mentions', async () => {
        findings.mock(apiUrl, settings).persist()

        let p = {
            query: `https://semgrep.dev/orgs/${settings.deployment}/findings/67557103`,
        }
        let mentions = await (semgrep.mentions ? semgrep.mentions(p, settings) : [])
        expect(mentions.length).toEqual(0)

        settings.repo = ''
        p = {
            query: `https://semgrep.dev/orgs/${settings.deployment}/findings/67557107`,
        }
        mentions = await (semgrep.mentions ? semgrep.mentions(p, settings) : [])
        expect(mentions.length).toBeGreaterThan(0)
        for (const mention of mentions) {
            expect(Object.keys(mention)).toEqual(['title', 'data', 'uri'])
        }

        p = { query: 'lorem ipsum dolor si amet' }
        const mx = async () => {
            mentions = semgrep.mentions ? await semgrep.mentions(p, client.settings()) : []
        }
        expect(mx).rejects.toThrow(TypeError)
    })
})
