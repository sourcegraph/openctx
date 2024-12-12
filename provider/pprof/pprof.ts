import { execSync } from 'node:child_process'
import { constants, accessSync, readdirSync } from 'node:fs'
import { basename, dirname, join, parse } from 'node:path'
import { matchGlob } from '@openctx/provider'

/**
 * topNodeRegex is the output in `pprof -top` command for a single node
 *
 * An example output would look like this (first row for reference only):
 *
 * ```
 *  flat  flat%   sum%        cum   cum%
 *  5.59s 42.93% 43.16%      6.21s 47.70%  container/list.(*List).Init
 * ```
 *
 * @see https://regex101.com/r/hP9plv/1
 */
const topNodeRegex =
    /^ +(?<flat>[\d\\.]+)(?<unit>\w+) +(?<flatPerc>[\d\\.]+)% +(?:[\d\\.]+)% +(?<cum>[\d\\.]+)(?:\w+) +(?<cumPerc>[\d\\.]+)% +(?<func>[\w\\.\\(\\*\\)\\/]+)/

/**
 * PprofTool is a CLI tool for reading and visualizing profile reports.
 * `pprof` is bundled with every `go` binary, but may also be installed as a standalone tool.
 */
export type PprofTool = 'go tool pprof' | 'pprof'

export function getPprof(): Pprof | null {
    try {
        const stdout = execSync('which go').toString('utf-8').trim()
        if (!stdout.endsWith('not found')) {
            return new Pprof('go tool pprof')
        }
    } catch (e) {}

    try {
        const stdout = execSync('which pprof').toString('utf-8').trim()
        if (!stdout.endsWith('not found')) {
            return new Pprof('pprof')
        }
    } catch (e) {}

    return null
}

interface SearchOptions {
    reportGlob: string
    workspaceRoot?: string
    rootDirectoryMarkers?: string[]
    binaryGlob?: string
}

/** PprofSources are passed to pprof command. */
interface PprofSources {
    report?: string
    binary?: string
}

export function findReportPath(currentDir: string, options: SearchOptions): PprofSources {
    const matchReport = matchGlob(options.reportGlob)
    const matchBinary = options.binaryGlob ? matchGlob(options.binaryGlob) : matchGoBinary

    const reachedRoot = (dir: string): boolean => {
        if (options.workspaceRoot !== undefined) {
            return options.workspaceRoot === dir
        }
        if (!options.rootDirectoryMarkers?.length) {
            return false
        }

        const markers = options.rootDirectoryMarkers
        try {
            return readdirSync(dir).some(f => markers.includes(f))
        } catch {
            return false
        }
    }

    const sources: PprofSources = {}
    let searchDir = currentDir

    while (true) {
        let contents: string[] = []
        try {
            contents = readdirSync(searchDir)
        } catch (e) {
            break
        }

        for (const file of contents) {
            const fullPath = join(searchDir, file)
            if (!sources.report && matchReport(fullPath)) {
                sources.report = fullPath
            }

            // The search favours the binary that's closest to the report file,
            // as `sources.binary` will be overwritten with the more recent matches.
            if (matchBinary(fullPath)) {
                sources.binary = fullPath
            }
        }

        // Note, that by breaking the loop after finding the report we assume that the binary
        // is located in in the same directories or in one of the directories we've searched before.
        // Which is a rather fair assumption.
        if (sources.report || reachedRoot(searchDir) || searchDir === '/') {
            break
        }
        searchDir = dirname(searchDir)
    }

    return sources
}

/**
 * matchGoBinary is a fallback matcher for finding Go binary to pass as a source to `pprof`.
 *
 * It uses a heuristic of relying on Go's convention to name binaries as their parent directories.
 * For example, running `go build .` in `/project/cmd/thing` directory will produce `/project/cmd/thing/thing` binary.
 *
 * Go build automatically assigns "execute" permission to the binary, so `matchGoBinary` will only match executable files
 * in order to differentiate from normal files that are called the same as their parent directory.
 * @param file Full path to the file
 * @returns
 */
function matchGoBinary(file: string): boolean {
    const { base: name, ext, dir: dirFull } = parse(file)
    const dir = basename(dirFull)

    if (name !== dir || ext !== '') {
        return false
    }
    return isExecutable(file)
}

/** isExecutable checks that a file has the "execute" permission. */
function isExecutable(file: string): boolean {
    try {
        accessSync(file, constants.X_OK)
        return true
    } catch (err) {
        return false
    }
}

export interface TopOptions {
    /** package limits the entries to the current package (`-show="^package\."`)*/
    package: string

    /** nodeCount limits the number of results returned (`-nodecount=x`). Skipped if not set. */
    nodeCount?: number

    /** excludeInline excludes inline function calls from the output (`-noinlines`) */
    excludeInline?: boolean

    /** sort controls how nodes are sorted in the output (`-flat` or `-cum`) */
    sort?: 'flat' | 'cum'
}

export interface TopOutput {
    /** Name of the binary used to generate the report. If no binary was passed to `pprof` command, this field is `undefined`. */
    file?: string
    type: string
    unit: string
    nodes: Node[]
}

export interface Node {
    function: string

    /** Absolute CPU time/ memory associated with this function only. */
    flat: number

    /** Relative CPU time / memory associated with this function only. */
    flatPerc: number

    /** CPU time / memory associated with the function and its descendants. */
    cum: number

    /** Relative CPU time / memory associated with the function and its descendants. */
    cumPerc: number
}

export interface ListOutput {
    /** Raw output of `pprof -list`. */
    raw: string
}

/**
 * Pprof is a wrapper for working with `pprof` CLI.
 */
export class Pprof {
    private tool: PprofTool
    private sources: PprofSources

    constructor(tool: PprofTool) {
        this.tool = tool
        this.sources = {}
    }

    setSources(sources: PprofSources) {
        this.sources = sources
    }

    top(options: TopOptions): TopOutput | null {
        if (!this.sources.report) {
            return null
        }

        const cmd = this.topCmd(options)

        let out: string | null = null
        try {
            out = execSync(cmd).toString('utf-8').trim()
        } catch (e) {
            return null
        }

        if (
            out === null ||
            out.includes('no such file or directory') ||
            out.includes('Show expression matched no samples')
        ) {
            return null
        }

        return this.parseTop(out)
    }

    private topCmd(options: TopOptions): string {
        const { report, binary } = this.sources
        const opt: TopOptions = {
            ...options,
            sort: options.sort ?? 'cum',
            excludeInline: options.excludeInline ?? true,
        }

        let cmd = this.tool + ` -top -show="${options.package}\\." -${opt.sort}`

        if (opt.excludeInline) {
            cmd += ' -noinlines'
        }

        if (options.nodeCount) {
            cmd += ` -nodecount=${options.nodeCount}`
        }

        // Standalone `pprof` is not able to parse a Go binary, so it ignores it altogether.
        // Should we omit it from the command in case this.tool === 'pprof' ?
        if (binary) {
            cmd += ` ${binary}`
        }
        cmd += ` ${report}`
        return cmd
    }

    private parseTop(output: string): TopOutput | null {
        const binaryName = /^File: ([\w-\\/]+)/m.exec(output)
        const reportType = /^Type: (\w+)/m.exec(output)

        let unit: string | null = null
        const nodes: Node[] = []

        // Find the table with per-function stats and discard the headers
        const startPos = output.search(/ +flat +flat% +sum% +cum +cum%/)
        if (startPos === -1) {
            return null
        }
        const lines = output.substring(startPos).split('\n').slice(1)
        for (const line of lines) {
            const match = topNodeRegex.exec(line)
            if (match === null || !match.groups) {
                continue
            }
            const { groups: node } = match

            if (unit === null) {
                unit = node.unit
            }

            // Should we include the raw output here the way we do in list()?
            // It may include entries for other functions in the same package
            // which are declared in different files, which might be a useful
            // information to Cody.
            nodes.push({
                function: node.func,
                flat: Number.parseFloat(node.flat),
                flatPerc: Number.parseFloat(node.flatPerc),
                cum: Number.parseFloat(node.cum),
                cumPerc: Number.parseFloat(node.cumPerc),
            })
        }

        return {
            type: reportType ? (reportType[1] ?? 'cpu') : '',
            file: binaryName ? binaryName[1] : undefined,
            unit: unit ?? 's',
            nodes: nodes,
        }
    }

    /**
     * list fetches the detailed line-by-line breakdown of the function's resource consumption.
     * @param funcRegex fully-qualified function name. That includes both the package name and the name of the struct if the function is a method.
     * E.g. `example.MyFunction` or `example.(*ReceiverStruct).MyMethod`.
     * @returns raw `-list` output
     */
    public list(funcRegex: string): ListOutput | null {
        if (!this.sources.report) {
            return null
        }

        const cmd = this.listCmd(funcRegex)

        let out: string | null = null
        try {
            out = execSync(cmd).toString('utf-8').trim()
        } catch (e) {
            return null
        }

        if (
            out === null ||
            out.includes('no such file or directory') ||
            out.includes('no matches found for regexp')
        ) {
            return null
        }
        return { raw: out }
    }

    private listCmd(funcRegex: string): string {
        const { report, binary } = this.sources

        let cmd = this.tool + ` -list "${escapeSpecial(funcRegex)}"`
        if (binary) {
            cmd += ` ${binary}`
        }
        cmd += ` ${report}`

        return cmd
    }
}

/**
 * Escape all special regex characters in a string.
 * @param s string
 * @returns string
 */
function escapeSpecial(s: string): string {
    return s.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&')
}
