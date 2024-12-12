import { dirname } from 'node:path'
import type {
    Annotation,
    AnnotationsParams,
    AnnotationsResult,
    Item,
    MetaParams,
    MetaResult,
    Provider,
} from '@openctx/provider'
import { parseGolang } from './parser.js'
import { type Node, type TopOptions, findReportPath as findPprofSources, getPprof } from './pprof.js'

interface Settings {
    /**
     * Glob pattern to match the profile report.
     *
     * Note, that forward slashes _do not need_ to be escaped in the patterns provided in `settings.json`
     *
     * @default "**\/*.pprof"
     * @example "**\/cmd\/*.pb.gz" (limit to asubdirectory)
     */
    reportGlob?: string

    /**
     * Glob pattern to match the Go binary from which the report was generated.
     *
     * By default `binaryGlob` not set. The provider will try to locate it by searching
     * for an executable file whose name matches that of its parent directory.
     * This is what a binary produces by `go build .` would be conventionally named.
     */
    binaryGlob?: string

    /**
     * The provider will not traverse the file tree past the directory containing `rootDirectoryMarkers`,
     * when searching for the profile report and the binary.
     *
     * @default [".git", "go.mod"]
     */
    rootDirectoryMarkers?: string[]

    /**
     * Options to control `pprof -top` output.
     *
     * @default top: { excludeInline: true, sort: 'cum' }
     * @example top: { excludeInline: false, sort: 'flat', nodeCount: 10 }
     */
    top?: Pick<TopOptions, 'excludeInline' | 'nodeCount' | 'sort'>
}

/**
 * An [OpenCtx](https://openctx.org) provider that annotates every function declaration with
 * the CPU time and memory allocations associated with it.
 *
 * Only Go files are supported.
 */
const pprof: Provider<Settings> = {
    meta(params: MetaParams, settings: Settings): MetaResult {
        return {
            name: 'pprof',
            annotations: {
                selectors: [{ path: '**/*.go' }],
            },
        }
    },

    annotations(params: AnnotationsParams, settings: Settings): AnnotationsResult {
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
            reportGlob: settings.reportGlob || '**/*.pprof',
            rootDirectoryMarkers: settings.rootDirectoryMarkers || ['.git', 'go.mod'],
            binaryGlob: settings.binaryGlob,
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

        const top = pprof.top({ ...settings.top, package: content.package })
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
                title: `pprof ${top.type}: cum ${node.cum}${top.unit}, ${node.cumPerc}% (#${i + 1
                    }, sort=${settings.top?.sort || 'cum'})`,
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
