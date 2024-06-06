import { readdirSync } from 'fs'
import { type ExecException, exec } from 'node:child_process'
import { beforeEach, describe, expect, test, vi } from 'vitest'
import {
    Pprof,
    type PprofTool,
    type TopOptions,
    type TopOutput,
    findReportPath,
    getPprof,
} from './pprof.js'

vi.mock('node:child_process', () => ({ exec: vi.fn() }))
const execMock = vi.mocked(exec)

vi.mock('fs', () => ({ readdirSync: vi.fn() }))
const readdirSyncMock = vi.mocked(readdirSync)

describe('pprof', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    test('get pprof (installed)', () => {
        execMock.mockImplementationOnce(mockExec('/usr/local/go/bin') as unknown as typeof exec)

        const pprof = getPprof()

        expect(exec).toHaveBeenCalledOnce()
        expect(pprof).not.toBeNull()
    })

    test('get pprof (not installed)', () => {
        execMock.mockImplementationOnce(mockExec('go not found') as unknown as typeof exec)

        const pprof = getPprof()

        expect(exec).toHaveBeenCalledOnce()
        expect(pprof).toBeNull()
    })

    test('find report (exists)', () => {
        readdirSyncMock.mockImplementation(((s: string): string[] => {
            return s === '/path/to' ? ['report.pprof'] : []
        }) as unknown as typeof readdirSync)

        const profilePath = findReportPath('/path/to/current', {
            reportGlob: '*.pprof',
            workspaceRoot: '/path',
        })

        expect(profilePath).toBe('/path/to/report.pprof')
    })

    test('find report with rootDirectoryMarkers (does not exist)', () => {
        readdirSyncMock.mockImplementation(((s: string): string[] => {
            switch (s) {
                case '/':
                    // Should not reach this case
                    return ['other.pprof']
                case '/root':
                    // Contains root directory markers
                    return ['README.md', '.git']
                default:
                    return []
            }
        }) as unknown as typeof readdirSync)

        const profilePath = findReportPath('/root/to/current', {
            reportGlob: '*.pprof',
            rootDirectoryMarkers: ['.git'],
        })

        expect(profilePath).toBeNull()
    })

    test('find report with workspaceRoot (does not exist)', () => {
        readdirSyncMock.mockImplementation(((s: string): string[] => {
            return []
        }) as unknown as typeof readdirSync)

        const profilePath = findReportPath('/path/to/current', {
            reportGlob: '*.pprof',
            workspaceRoot: '/path',
        })

        expect(profilePath).toBeNull()
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
            name: 'defaults',
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
        execMock.mockImplementationOnce(mockExec('') as unknown as typeof exec)
        const pprof = new Pprof(tt.tool)
        pprof.setReport('report.pprof')
        pprof.setBinary(tt.binary)

        pprof.top(tt.opts)

        expect(execMock).toHaveBeenCalledOnce()
        expect(exec).toHaveBeenCalledWith(tt.want, expect.any(Function))
    })

    test.only('top (CPU)', () => {
        const outputCpu = `File: pprof-example
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
        0.63s  4.84% 48.00%      0.63s  4.84%  pkg/list.(*L).Init`

        const tool: PprofTool = 'go tool pprof'
        const topOptions: TopOptions = { package: 'main' }
        execMock.mockImplementationOnce(mockExec(outputCpu) as unknown as typeof exec)

        const pprof = new Pprof(tool)
        pprof.setReport('/path/to/report.pprof')

        const top = pprof.top(topOptions)

        expect(top).toStrictEqual<TopOutput>({
            file: 'pprof-example',
            type: 'cpu',
            unit: 's',
            nodes: [
                { function: 'main.main', flat: 0.03, flatPerc: 0.23, cum: 6.38, cumPerc: 49 },
                { function: 'main.Run', flat: 5.59, flatPerc: 42.93, cum: 6.21, cumPerc: 47.7 },
                { function: 'pkg/list.(*L).Init', flat: 0.63, flatPerc: 4.84, cum: 0.63, cumPerc: 4.84 },
            ],
        })
    })
    test.todo('list')
})

type ExecCallback = (error: ExecException | null, stdout: string, stderr: string) => void

function mockExec(stdout: string): (command: string, callback?: ExecCallback) => void {
    return (command: string, callback?: ExecCallback) => {
        if (callback) {
            callback(null, stdout, '')
        }
    }
}
