import { execSync } from 'child_process'
import { readdirSync } from 'fs'
import { dirname, join } from 'path'
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
 * @see https://regex101.com/r/26v9rd/1
 */
const topNodeRegex =
    /^ +(?<flat>[\d\\.]+)(?<unit>\w) +(?<flatPerc>[\d\\.]+)% +(?:[\d\\.]+)% +(?<cum>[\d\\.]+)(?:\w) +(?<cumPerc>[\d\\.]+)% +(?<func>[\w\\.\\(\\*\\)\\/]+)/

/**
 * PprofTool is a CLI tool for reading and visualizing profile reports.
 * `pprof` is bundled with every `go` binary, but may also be installed as a standalone tool.
 */
export type PprofTool = 'go tool pprof' | 'pprof'

export function getPprof(): Pprof | null {
    let hasGo = false

    try {
        const stdout = execSync('which go').toString('utf-8').trim()
        if (!stdout.endsWith('not found')) {
        hasGo = true
        }
    } catch (e) {
        return null
    }

    if (!hasGo) {
        return null
    }
    return new Pprof('go tool pprof')
}

interface SearchOptions {
    reportGlob: string
    workspaceRoot?: string
    rootDirectoryMarkers?: string[]
    binaryGlob?: string // TODO: find binary if possible
}

export function findReportPath(currentDir: string, options: SearchOptions): string | null {
    const matchReport = matchGlob(options.reportGlob)
    // const matchBinary = options.binaryGlob ? matchGlob(options.binaryGlob) : (s: string) => falses

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

    let report: string | null = null
    let searchDir = currentDir

    Search: while (true) {
        let contents: string[] = []
        try {
            contents = readdirSync(searchDir)
        } catch (e) {
            return null
        }

        for (const file of contents) {
            // TODO: search for binary
            // Note, that by breaking the loop after finding the report we assume that the binary
            // is located in in the same directories or in one of the directories we've searched before.
            // Which is a rather fair assumption.
            if (matchReport(file)) {
                report = join(searchDir, file)
                break Search
            }
        }

        if (reachedRoot(searchDir) || searchDir === '/') {
            return null
        }
        searchDir = dirname(searchDir)
    }

    return report
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

/**
 * Pprof is a wrapper for working with `pprof` CLI.
 */
export class Pprof {
    private tool: PprofTool
    private report: string | null = null
    private binary?: string

    constructor(tool: PprofTool) {
        this.tool = tool
    }

    setReport(path: string) {
        this.report = path
    }

    setBinary(path?: string) {
        this.binary = path
    }

    // TODO: return raw output
    top(options: TopOptions): TopOutput | null {
        if (!this.report) {
            return null
        }

        const cmd = this.topCmd(options)

        let out: string | null = null
        try {
            out = execSync(cmd).toString('utf-8').trim()
        } catch (e) {
            return null
        }

        if (out === null || out.includes('no such file or directory')) {
            return null
        }

        return this.parseTop(out)
    }

    private topCmd(options: TopOptions): string {
        let cmd = this.tool + ` -top -show="${options.package}\\."`
        cmd += options.sort ? ` -${options.sort}` : ' -cum'

        if (options.excludeInline === undefined || options.excludeInline === true) {
            cmd += ' -noinlines'
        }

        if (this.binary) {
            cmd += ` ${this.binary}`
        }
        cmd += ` ${this.report}`
        return cmd
    }

    private parseTop(output: string): TopOutput | null {
        const binaryName = /^File: ([\w-\\/]+)/m.exec(output)
        const reportType = /^Type: (\w+)/m.exec(output)

        let unit: string | null = null
        const nodes: Node[] = []

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

            nodes.push({
                function: node.func,
                flat: parseFloat(node.flat),
                flatPerc: parseFloat(node.flatPerc),
                cum: parseFloat(node.cum),
                cumPerc: parseFloat(node.cumPerc),
            })
        }

        return {
            type: reportType ? reportType[1] || 'cpu' : 'cpu',
            file: binaryName ? binaryName[1] : undefined,
            unit: unit || 's',
            nodes: nodes,
        }
    }
}
