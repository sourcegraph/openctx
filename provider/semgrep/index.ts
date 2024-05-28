
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

import API from './client.js'
import type { Finding } from './api.js'

export type Settings = {
    deployment: string,     // Deployment slug
    token: string           // Semgrep app token
}


export function helperText(finding: Finding): string {
    return [
        finding.rule_name ?? '',
        finding.rule_message ?? '',
        finding.rule.name ?? '',
        finding.rule.message ?? '',
        finding.triage_comment ?? '',
        finding.triage_reason ?? '',
        finding.assistant?.autofix?.fix_code ?? '',
        finding.assistant?.autofix?.explanation ?? '',
        finding.assistant?.autotriage?.reason ?? ''
    ].join('\n')
}

const semgrep: Provider = {
    meta(params: MetaParams, settings: Settings): MetaResult {
        return {name: 'Semgrep', features: { mentions: true }}
    },

    async items(params: ItemsParams, settings: Settings): Promise<ItemsResult> {
        if (params.mention?.data?.finding === undefined) return []
        const finding: Finding = params.mention.data.finding as Finding
        return !finding ? [] : [{
            title: finding.rule_name,
            url: finding.line_of_code_url,
            ai: {content: helperText(finding)},
            ui: {hover: {text: finding.rule_name}},
        }]
    },

    mentions(params: MentionsParams, settings: Settings): MentionsResult {
        return [] // TODO
    },

    async annotations(params: AnnotationsParams, settings: Settings): Promise<AnnotationsResult> {
        const anns: Annotation[] = []
        const client: API = new API(settings)
        const findings = await client.findings() || []

        // TODO(Harish): Match current file path against location.file_path before assigning annotations
        findings.forEach((f: Finding) => {
            anns.push({
                uri: f.line_of_code_url,
                item: {
                    title: f.rule_name,
                    url: f.line_of_code_url
                },
                range: {
                    start: {line: f.location.line, character: f.location.column},
                    end: {line: f.location.end_line, character: f.location.end_column}
                }
            })
        })
        return anns
    },
}

export default semgrep
