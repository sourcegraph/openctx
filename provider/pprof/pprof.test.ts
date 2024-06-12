import { execSync } from 'child_process'
import { type Dirent, type PathLike, accessSync, readdirSync } from 'fs'
import { beforeEach, describe, expect, test, vi } from 'vitest'
import {
    type ListOutput,
    Pprof,
    type PprofTool,
    type TopOptions,
    type TopOutput,
    findReportPath,
    getPprof,
} from './pprof.js'

vi.mock('child_process', () => ({ execSync: vi.fn() }))
const execSyncMock = vi.mocked(execSync)

vi.mock('fs', async () => {
    const fs = await vi.importActual('fs')
    return { ...fs, readdirSync: vi.fn(), accessSync: vi.fn() }
})
const readdirSyncMock = vi.mocked(readdirSync)
const accessSyncMock = vi.mocked(accessSync)

describe('pprof', () => {
    beforeEach(() => {
        vi.clearAllMocks()
        vi.resetAllMocks()
    })

    test('get pprof (go installed)', () => {
        execSyncMock.mockImplementation(whichCommand('go', '/usr/local/go/bin/og', 'pprof'))

        const pprof = getPprof()

        expect(execSync).toHaveBeenCalled()
        expect(pprof).not.toBeNull()
    })

    test('get pprof (standalone pprof installed)', () => {
        execSyncMock.mockImplementation(whichCommand('pprof', '/usr/local/go/bin/pprof', 'go'))

        const pprof = getPprof()

        expect(execSync).toHaveBeenCalled()
        expect(pprof).not.toBeNull()
    })

    test('get pprof (not installed)', () => {
        execSyncMock.mockReturnValueOnce(buffer('go not found'))

        const pprof = getPprof()

        expect(execSync).toHaveBeenCalled()
        expect(pprof).toBeNull()
    })

    test('find report (exists)', () => {
        readdirSyncMock.mockReturnValue(['report.pprof'] as unknown as Dirent[])

        const sources = findReportPath('/path/to/current', {
            reportGlob: '**/to/*.pprof',
            workspaceRoot: '/path',
        })

        expect(sources.report).toBe('/path/to/report.pprof')
    })

    test('find report with rootDirectoryMarkers (does not exist)', () => {
        readdirSyncMock.mockImplementation(((s: string): string[] => {
            switch (s) {
                case '/':
                    throw new Error('should not check after root directory')
                case '/path':
                    // Contains root directory markers
                    return ['README.md', '.git']
                default:
                    return []
            }
        }) as unknown as typeof readdirSync)

        const sources = findReportPath('/path/to/current', {
            reportGlob: '**/*.pprof',
            rootDirectoryMarkers: ['.git'],
        })

        expect(sources.report).toBeUndefined()
    })

    test('find report with workspaceRoot (does not exist)', () => {
        readdirSyncMock.mockReturnValue(['report.pprof'] as unknown as Dirent[])

        const sources = findReportPath('/path/to/current', {
            reportGlob: '/other/path/**/*.pprof',
            workspaceRoot: '/path',
        })

        expect(sources.report).toBeUndefined()
    })

    test('find binary (exists in the same directory)', () => {
        // File 'mybinary' exists in every directory, but only /root/mybinary/mybinary is executable
        readdirSyncMock.mockReturnValue(['mybinary', 'test.yaml', 'README.md'] as unknown as Dirent[])
        accessSyncMock.mockImplementation((file: PathLike, mode?: number): void => {
            if (!(file as string).endsWith('/mybinary')) {
                throw new Error('not a binary')
            }
        })

        const sources = findReportPath('/root/mybinary/is/here', {
            reportGlob: '**/*.pprof',
            workspaceRoot: '/root',
        })

        expect(sources.binary).toBe('/root/mybinary/mybinary')
        expect(accessSync).toHaveBeenCalled()
    })

    test('find binary (matches binaryGlob)', () => {
        readdirSyncMock.mockImplementation(((s: string): string[] => {
            return s === '/root/cmd/here/comes' ? ['mybinary.exe', 'mybinary.yaml', 'nothing'] : []
        }) as unknown as typeof readdirSync)

        const sources = findReportPath('/root/cmd/here/comes/nothing', {
            reportGlob: '**/*.pprof',
            binaryGlob: '**/cmd/**/*.exe',
            workspaceRoot: '/root',
        })

        expect(sources.binary).toBe('/root/cmd/here/comes/mybinary.exe')
    })

    type TopCmdTest = { name: string; tool: PprofTool; opts: TopOptions; binary?: string; want: string }

    test.each<TopCmdTest>([
        {
            name: 'defaults',
            tool: 'go tool pprof',
            opts: { package: 'main' },
            want: `go tool pprof -top -show="main\\." -cum -noinlines report.pprof`,
        },
        {
            name: 'include binary',
            tool: 'go tool pprof',
            opts: { package: 'main' },
            binary: './my-binary',
            want: `go tool pprof -top -show="main\\." -cum -noinlines ./my-binary report.pprof`,
        },
        {
            name: 'sort flat',
            tool: 'go tool pprof',
            opts: { package: 'main', sort: 'flat' },
            binary: './my-binary',
            want: `go tool pprof -top -show="main\\." -flat -noinlines ./my-binary report.pprof`,
        },
        {
            name: 'include inline',
            tool: 'go tool pprof',
            opts: { package: 'main', excludeInline: false },
            want: `go tool pprof -top -show="main\\." -cum report.pprof`,
        },
    ])('top command ($name)', (tt: TopCmdTest) => {
        execSyncMock.mockReturnValueOnce(buffer(''))
        const pprof = new Pprof(tt.tool)
        pprof.setSources({ report: 'report.pprof', binary: tt.binary })

        pprof.top(tt.opts)

        expect(execSyncMock).toHaveBeenCalledOnce()
        expect(execSync).toHaveBeenCalledWith(tt.want)
    })

    type TopParseTest = {
        name: string
        stdout: string
        want: TopOutput
    }
    test.each<TopParseTest>([
        {
            name: 'cpu',
            stdout: `File: pprof-example
Type: cpu
Time: Jun 1, 2024 at 10:56pm (CEST)
Duration: 8.39s, Total samples = 13.02s (155.11%)
Active filters:
    show=^main\.
Showing nodes accounting for 6.25s, 48.00% of 13.02s total
Dropped 2 nodes (cum <= 0.07s)
Showing top 3 nodes out of 7
        flat  flat%   sum%        cum   cum%
        0.03s  0.23%  0.23%      6.38s 49.00%  main.main
        5.59s 42.93% 43.16%      6.21s 47.70%  main.Run
        0.63s  4.84% 48.00%      0.63s  4.84%  pkg/list.(*L).Init`,
            want: {
                file: 'pprof-example',
                type: 'cpu',
                unit: 's',
                nodes: [
                    { function: 'main.main', flat: 0.03, flatPerc: 0.23, cum: 6.38, cumPerc: 49 },
                    { function: 'main.Run', flat: 5.59, flatPerc: 42.93, cum: 6.21, cumPerc: 47.7 },
                    {
                        function: 'pkg/list.(*L).Init',
                        flat: 0.63,
                        flatPerc: 4.84,
                        cum: 0.63,
                        cumPerc: 4.84,
                    },
                ],
            },
        },
        {
            name: 'memory',
            stdout: `File: pprof-example
Type: inuse_space
Time: May 31, 2024 at 7:35pm (CEST)
Active filters:
    show=main\.
Showing nodes accounting for 116.43MB, 100% of 116.43MB total
        flat  flat%   sum%        cum   cum%
        0.43MB  0.23%  0.23%      6.38MB 49.00%  main.main
        77.4MB 42.93% 43.16%      6.21MB 47.70%  main.Run
        10.0MB  4.84% 48.00%      10.0MB  4.84%  pkg/list.(*L).Init`,
            want: {
                file: 'pprof-example',
                type: 'inuse_space',
                unit: 'MB',
                nodes: [
                    { function: 'main.main', flat: 0.43, flatPerc: 0.23, cum: 6.38, cumPerc: 49 },
                    { function: 'main.Run', flat: 77.4, flatPerc: 42.93, cum: 6.21, cumPerc: 47.7 },
                    {
                        function: 'pkg/list.(*L).Init',
                        flat: 10.0,
                        flatPerc: 4.84,
                        cum: 10.0,
                        cumPerc: 4.84,
                    },
                ],
            },
        },
    ])('parsing top output ($name)', (tt: TopParseTest) => {
        const tool: PprofTool = 'go tool pprof'
        const topOptions: TopOptions = { package: 'main' }
        execSyncMock.mockReturnValueOnce(buffer(tt.stdout))

        const pprof = new Pprof(tool)
        pprof.setSources({ report: '/path/to/report.pprof' })

        const top = pprof.top(topOptions)

        expect(top).toStrictEqual<TopOutput>(tt.want)
    })

    test('list', () => {
        const stdout = `Total: 116.43MB
ROUTINE ======================== main.buildDiamond in /Users/johndoe/go/src/local/pprof-example/main.go
            0    49.57MB (flat, cum) 42.57% of Total
            .          .    108:func buildDiamond(cfgraph *CFG, start int) int {
            .          .    109:   bb0 := start
            .    11.50MB    110:   NewBasicBlockEdge(cfgraph, bb0, bb0+1)
            .    21.06MB    111:   NewBasicBlockEdge(cfgraph, bb0, bb0+2)
            .    13.50MB    112:   NewBasicBlockEdge(cfgraph, bb0+1, bb0+3)
            .     3.50MB    113:   NewBasicBlockEdge(cfgraph, bb0+2, bb0+3)
            .          .    114:
            .          .    115:   return bb0 + 3
            .          .    116:}
            .          .    117:
            .          .    118:func buildConnect(cfgraph *CFG, start int, end int) {`
        execSyncMock.mockReturnValueOnce(buffer(stdout))
        const pprof = new Pprof('pprof')
        pprof.setSources({ report: 'report.mprof', binary: './mybinary' })

        const list = pprof.list('example.(*Thing).Do')

        expect(execSyncMock).toHaveBeenCalledOnce()
        expect(execSync).toHaveBeenCalledWith(
            `pprof -list "example\\.\\(\\*Thing\\)\\.Do" ./mybinary report.mprof`
        )
        expect(list).toStrictEqual<ListOutput>({ raw: stdout })
    })
})

function buffer(s: string): Buffer {
    return Buffer.from(s, 'utf-8')
}

/**
 * whichCommand helper returns a mock implementation for `execSync` that expects some kind of lookup command,
 * e.g. `which`, and returns "not found" for binaries that should not be found in the mock invocation.
 * @param found name of the executable that is "found" in this mock
 * @param foundPath executable path that should be returned
 * @param notFound name of the executable that is "not found" in this mock
 * @returns stdout buffer
 */
function whichCommand(found: string, foundPath: string, notFound: string): (cmd: string) => Buffer {
    return (cmd: string): Buffer => {
        switch (true) {
            case cmd.includes(found):
                return buffer(foundPath)
            case cmd.includes(notFound):
                return buffer(`${notFound} not found`)
        }
        return buffer('command not found: ' + cmd)
    }
}
