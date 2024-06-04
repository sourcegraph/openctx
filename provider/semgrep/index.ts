import type {
    Annotation,
    AnnotationsParams,
    AnnotationsResult,
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
    deployment: string // Semgrep deployment slug
    token: string // Semgrep app token
    repo?: string // Semgrep scan repository
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
        return { name: 'Semgrep', annotations: {}, mentions: {} }
    },

    items(params: ItemsParams, settings: Settings): ItemsResult {
        if (params.mention?.data?.finding === undefined) return []
        const finding: Finding = params.mention.data.finding as Finding
        return !finding
            ? []
            : [
                  {
                      title: finding.rule_name,
                      ai: { content: aiPrompt(finding) },
                      ui: { hover: { text: finding.rule_name } },
                      url: urlfor(settings.deployment, finding.repository.name, finding.id),
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

    async annotations(params: AnnotationsParams, settings: Settings): Promise<AnnotationsResult> {
        const anns: Annotation[] = []
        const client: API = new API(settings)
        const findings = (await client.findings()) || []

        // TODO(Harish): Match current file path against location.file_path
        for (const f of findings) {
            anns.push({
                uri: params.uri,
                item: {
                    title: f.rule_name,
                    url: urlfor(settings.deployment, f.repository.name, f.id),
                },
                range: {
                    start: { line: f.location.line, character: f.location.column },
                    end: { line: f.location.end_line, character: f.location.end_column },
                },
            })
        }

        return anns
    },
}

export default semgrep
