import { dirname } from 'path'
import type {
    Annotation,
    AnnotationsParams,
    AnnotationsResult,
    Item,
    MetaParams,
    MetaResult,
    Provider,
    ProviderSettings,
} from '@openctx/provider'
import { parseGolang } from './parser.js'
import { type Node, findReportPath as findPprofSources, getPprof } from './pprof.js'

/**
 * An [OpenCtx](https://openctx.org) provider that annotates every function declaration with
 * the CPU time and memory allocations associated with it.
 */
const pprof: Provider = {
    meta(params: MetaParams, settings: ProviderSettings): MetaResult {
        return {
            name: 'pprof',
            annotations: {
                selectors: [{ path: '**/*.go' }],
            },
        }
    },

    annotations(params: AnnotationsParams, settings: ProviderSettings): AnnotationsResult {
        // Test files do not need pprof annotations.
        if (params.uri.endsWith('_test.go')) {
            return []
        }

        const pprof = getPprof()
        if (pprof === null) {
            // TODO: log that no command line tool was found. Ideally, do it once on init.
            return []
        }

        const searchDir = dirname(params.uri).replace(/^file:\/{2}/, '')
        const sources = findPprofSources(searchDir, {
            reportGlob: (settings.reportGlob as string) || '**/*.pb.gz',
            rootDirectoryMarkers: settings.rootDirectoryMarkers as string[],
            // TODO: pass workspaceRoot once it's made available
            // workspaceRoot: workspaceRoot,
        })
        if (!sources.report) {
            return []
        }
        pprof.setSources(sources)

        const content = parseGolang(params.content)
        if (!content) {
            return []
        }

        const top = pprof.top({ package: content.package })
        if (top === null) {
            return []
        }

        const anns: Annotation[] = []
        top.nodes.forEach((node: Node, i: number) => {
            const func = content.funcs[node.function]
            if (!func) {
                return
            }

            let item: Item = {
                title: `pprof ${top.type}: ${node.cum}${top.unit}, ${node.cumPerc}% (#${i + 1}, cum)`,
            }

            const list = pprof.list(node.function)
            if (list) {
                item = {
                    ...item,
                    ai: {
                        content: "Output of 'pprof -list' command for this function:\n" + list.raw,
                    },
                }
            }

            anns.push({
                uri: params.uri,
                range: func.range,
                item: item,
            })
        })
        return anns
    },
}

export default pprof
