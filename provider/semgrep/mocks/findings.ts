import nock from 'nock'
import type { Settings } from '../index.js'

const response = {
    findings: [
        {
            id: 67557107,
            ref: 'main',
            syntactic_id: '9a17bb9c9077dfee2557672236990c21',
            match_based_id:
                '9eb77e51a19c491affbda8c3769d711bd5e9ee67e599c5ab3815511e46cc5d113bfe85390c63b96da29cff60f4c2c8aacdebcb27d6afe8ae98cccbf4bf140b5e_0',
            state: 'unresolved',
            repository: {
                name: 'opencodegraph',
                url: 'https://github.com/sourcegraph/opencodegraph',
            },
            line_of_code_url:
                'https://github.com/sourcegraph/opencodegraph/blob/49bfa64b7444200659298b9787b2d5b8b0a93ad3/lib/ui-standalone/src/chip/Chip.ts#L26',
            first_seen_scan_id: 26398574,
            triage_state: 'untriaged',
            confidence: 'low',
            created_at: '2024-05-28T06:38:54.962941Z',
            relevant_since: '2024-05-28T06:38:54.960146Z',
            rule_name: 'javascript.browser.security.insecure-document-method.insecure-document-method',
            rule_message:
                'User controlled data in methods like `innerHTML`, `outerHTML` or `document.write` is an anti-pattern that can lead to XSS vulnerabilities',
            location: {
                file_path: 'lib/ui-standalone/src/chip/Chip.ts',
                line: 26,
                column: 13,
                end_line: 26,
                end_column: 52,
            },
            triaged_at: null,
            triage_comment: null,
            triage_reason: null,
            state_updated_at: null,
            categories: ['security'],
            rule: {
                name: 'javascript.browser.security.insecure-document-method.insecure-document-method',
                message:
                    'User controlled data in methods like `innerHTML`, `outerHTML` or `document.write` is an anti-pattern that can lead to XSS vulnerabilities',
                confidence: 'low',
                category: 'security',
                subcategories: ['audit'],
                vulnerability_classes: ['Cross-Site-Scripting (XSS)'],
                cwe_names: [
                    "CWE-79: Improper Neutralization of Input During Web Page Generation ('Cross-site Scripting')",
                ],
                owasp_names: ['A07:2017 - Cross-Site Scripting (XSS)', 'A03:2021 - Injection'],
            },
            severity: 'high',
            sourcing_policy: {
                id: 116029,
                name: 'Rule Board - Audit column',
                slug: 'rule-board-audit',
            },
            assistant: null,
        },
    ],
}

const findings = {
    mock: (url: string, settings: Settings): nock.Scope => {
        return nock(url)
            .get(route => route.includes(`/deployments/${settings.deployment}/findings`))
            .reply(200, response)
    },
}

export default findings
