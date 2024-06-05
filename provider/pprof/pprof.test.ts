import { readdirSync } from 'fs'
import { type ExecException, exec } from 'node:child_process'
import { beforeEach, describe, expect, test, vi } from 'vitest'
import { findReportPath, getPprof } from './pprof.js'

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

    test.todo('top')
    test.todo('list')
})

type ExecCallback = (error: ExecException | null, stdout: string, stderr: string) => void

function mockExec(stdout: string): (command: string, callback?: ExecCallback) => void {
    return (_command: string, callback?: ExecCallback) => {
        if (callback) {
            callback(null, stdout, '')
        }
    }
}
