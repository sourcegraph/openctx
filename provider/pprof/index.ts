import { dirname } from 'path'
import type {
    Annotation,
    AnnotationsParams,
    AnnotationsResult,
    MetaParams,
    MetaResult,
    Provider,
    ProviderSettings,
} from '@openctx/provider'
import { escapeSpecial, parseGolang } from './parser.js'
import { type Node, findReportPath, getPprof } from './pprof.js'

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
        const report = findReportPath(searchDir, {
            reportGlob: (settings.reportGlob as string) || '**/*.pb.gz',
            rootDirectoryMarkers: settings.rootDirectoryMarkers as string[],
            // TODO: pass workspaceRoot once it's made available
            // workspaceRoot: workspaceRoot,
        })
        if (report === null) {
            return []
        }
        pprof.setReport(report)

        const content = parseGolang(params.content)
        if (!content) {
            return []
        }

        const top = pprof.top({ package: content.package })
        if (top === null) {
            return []
        }

        const anns: Annotation[] = []

        // TODO(1): turn Func[] into a Record<string, Func> for faster lookups.
        // TODO(2): do not escape pprofRegex, delay it until it's used in `pprof -list`.
        // This way we do not need to do the awkward conversion of `node.function` to match it.
        for (const func of content.funcs) {
            top.nodes.forEach((node: Node, i: number) => {
                if (func.pprofRegex !== escapeSpecial(node.function)) {
                    return
                }

                anns.push({
                    uri: params.uri,
                    range: func.range,
                    item: {
                        title: `[#${i + 1}] CPU Time: ${node.cum}${top.unit}, ${node.cumPerc}% (cum)`,
                    },
                })
            })
        }

        return anns
    },
}

export default pprof
