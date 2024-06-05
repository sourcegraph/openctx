import { exec } from 'child_process'
import { readdirSync } from 'fs'
import { dirname, join } from 'path'
import { matchGlob } from '@openctx/provider'

export function getPprof(): Pprof | null {
    let hasGo = false
    exec('which go', (error, stdout, stderr) => {
        if (error !== null || stdout.endsWith('not found')) {
            return
        }
        hasGo = true
    })

    if (!hasGo) {
        return null
    }
    return new Pprof()
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
        } catch {
            return null
        }

        for (const file of contents) {
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

export class Pprof {}
