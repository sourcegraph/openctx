import { beforeEach, describe, expect, test } from 'vitest'

import API from './client.js'
import findings from './mocks/findings.js'

import type { Findings } from './api.js'
import type { Settings } from './index.js'

describe('Semgrep client', () => {
    let client: API
    let defaults: Settings
    const apiUrl: string = 'https://semgrep.dev/api/v1'

    beforeEach(() => {
        client = new API({
            repo: 'opencodegraph',
            deployment: 'sourcegraph',
            token: 'foobarbazfoobarbazbarfoobaz',
        })
        defaults = client.settings()
        findings.mock(apiUrl, defaults).persist()
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
