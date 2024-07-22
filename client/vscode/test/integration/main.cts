import { mkdir, mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import * as path from 'node:path'
import { runTests } from '@vscode/test-electron'

async function main(): Promise<void> {
    // When run, this script's filename is `client/vscode/dist/tsc/test/integration/main.js`, so
    // __dirname is derived from that path, not this file's source path.
    const clientVsCodeRoot = path.resolve(__dirname, '..', '..', '..', '..')

    // The directory containing the extension's package.json, passed to --extensionDevelopmentPath.
    const extensionDevelopmentPath = clientVsCodeRoot

    // The path to the test runner script, passed to --extensionTestsPath.
    const extensionTestsPath = path.resolve(
        clientVsCodeRoot,
        'dist',
        'tsc',
        'test',
        'integration',
        'index.cjs'
    )

    let exitCode: number

    // Ensure we're running in a clean VS Code user data dir. We use a short
    // name to avoid "WARNING: IPC handle is longer than 103 chars, try a
    // shorter --user-data-dir"
    const tmpDir = await mkdtemp(path.join(tmpdir(), 'octxvstest-'))
    const tmpUserDataDir = path.join(tmpDir, 'userdata')
    const tmpWorkspaceDir = path.join(tmpDir, 'workspace')
    const tmpScratchDir = path.join(tmpDir, 'scratch')
    await mkdir(tmpUserDataDir)
    await mkdir(tmpWorkspaceDir)
    await mkdir(tmpScratchDir)

    try {
        exitCode = await runTests({
            version: '1.89.1',
            extensionDevelopmentPath,
            extensionTestsPath,
            extensionTestsEnv: {
                OPENCTX_VSCODE_INTEGRATION_TEST_TMP_SCRATCH_DIR: tmpScratchDir,
            },
            launchArgs: [
                tmpWorkspaceDir,
                '--profile-temp',
                `--user-data-dir=${tmpUserDataDir}`,
                '--disable-extensions',
            ],
        })
    } finally {
        await rm(tmpUserDataDir, { recursive: true, force: true })
    }
    process.exit(exitCode ?? 1)
}
main().catch(error => {
    console.error('Failed to run tests:', error)
    process.exit(1)
})
