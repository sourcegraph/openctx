import type {
    ItemsParams,
    ItemsResult,
    MentionsParams,
    MentionsResult,
    MetaParams,
    MetaResult,
    Provider,
} from '@openctx/provider'
import { XMLBuilder } from 'fast-xml-parser'

import { type Finding, type Findings, urlfor } from './api.js'
import API from './client.js'

export type Settings = {
    token: string // Semgrep app token
    repo?: string // Semgrep scan repository
    deployment?: string // Semgrep deployment slug
}

function parseUri(link: string): { deployment: string; finding: number } | null {
    const url = new URL(link)
    if (url.hostname.includes('semgrep.dev')) {
        try {
            const [d, f] = url.pathname.split('/orgs/')[1].split('/findings/')
            return { deployment: d, finding: parseInt(f) }
        } catch (err) {
            return null
        }
    }
    return null
}

function aiPrompt(finding: Finding): string {
    const xml = new XMLBuilder({ format: true })
    const info = {
        rule: {
            name: (finding.rule_name || finding.rule.name) ?? null,
            message: (finding.rule_message || finding.rule.message) ?? null,
        },
        triage: {
            state: finding.triage_state ?? null,
            reason: finding.triage_reason ?? null,
            comment: finding.triage_comment ?? null,
        },
        assistant: {
            autofix: {
                fixCode: finding.assistant?.autofix?.fix_code ?? null,
                explanation: finding.assistant?.autofix?.explanation ?? null,
            },
            autotriage: {
                reason: finding.assistant?.autotriage?.reason ?? null,
            },
        },
    }
    return xml.build(info)
}

const semgrep: Provider = {
    meta(params: MetaParams, settings: Settings): MetaResult {
        return { name: 'Semgrep', mentions: {} }
    },

    items(params: ItemsParams, settings: Settings): ItemsResult {
        if (params.mention?.data?.finding === undefined) return []
        const finding: Finding = params.mention.data.finding as Finding
        const uri =
            params.mention?.uri ?? urlfor(settings.deployment || '', finding.repository.name, finding.id)
        return !finding
            ? []
            : [
                  {
                      title: finding.rule_name,
                      ai: { content: aiPrompt(finding) },
                      ui: { hover: { text: finding.rule_name } },
                      url: uri,
                  },
              ]
    },

    async mentions(params: MentionsParams, settings: Settings): Promise<MentionsResult> {
        if (params.query) {
            const q: { deployment: string; finding: number } | null = parseUri(params.query)
            if (q) {
                const client: API = new API({
                    repo: settings.repo,
                    token: settings.token,
                    deployment: q.deployment,
                })
                const findings: Findings = await client.findings(q.finding)
                return !findings
                    ? []
                    : findings.map((f: Finding) => ({
                          title: f.rule_name,
                          data: { finding: f },
                          uri: urlfor(q.deployment, f.repository.name, f.id),
                      }))
            }
        }
        return []
    },
}

export default semgrep
