
import load from './settings.js'

import type {
    Annotation,
    AnnotationsParams,
    AnnotationsResult,
    MetaParams,
    MetaResult,
    Provider
} from '@openctx/provider'
export type Settings = { yaml: string }


const techstack: Provider<Settings> = {
    meta(params: MetaParams, settings: Settings): MetaResult {
        return {
            name: 'TechStack File',
            selector: [{ path: '**/*.js?(x)' }, { path: '**/*.ts?(x)' }],
            features: { mentions: false }
        }
    },

    async annotations(params: AnnotationsParams, settings: Settings): Promise<AnnotationsResult> {
        const anns: Annotation[] = []
        const regex = /\b(?:import\s*[\w{},\s]+|require\s*\([^)]+\))\s*/g

        if (settings.yaml !== null) {
            const targets = params.content
                .split(/\r?\n/)
                .map((line, index) => line.match(regex) ? {[index]: line} : null)
            const report = await load(settings.yaml)
            const pkgs = report.tools?.filter(t => t.detection_source === 'package.json')

            if (pkgs.length > 0) {
                targets.forEach((line, index) => {
                    if (line !== null) {
                        const target = Object.values(line as object).pop()
                        const tool = pkgs.find(p => target.includes(p.name))
                        if (tool !== undefined) {
                            anns.push({
                                uri: params.uri,
                                range: {
                                    start: { line: index, character: 0 },
                                    end: { line: index, character: 1 }
                                },
                                item: {
                                    title: `📖 Techstack: ${tool.sub_category}`,
                                    url: tool.website_url ?? tool.package_url
                                }
                            })
                        }
                    }
                })
            }
        }

        return anns
    },
}

export default techstack
