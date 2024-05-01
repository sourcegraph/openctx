import * as path from 'path'
import { runTests } from '@vscode/test-electron'

async function main(): Promise<void> {
    // When run, this script's filename is `client/vscode/dist/tsc/test/integration/main.js`, so
    // __dirname is derived from that path, not this file's source path.
    const clientVsCodeRoot = path.resolve(__dirname, '..', '..', '..', '..')

    // The test workspace is not copied to out/ during the TypeScript build, so we need to refer to
    // it in the src/ dir.
    const testWorkspacePath = path.resolve(clientVsCodeRoot, 'test', 'fixtures', 'workspace')

    // The directory containing the extension's package.json, passed to --extensionDevelopmentPath.
    const extensionDevelopmentPath = clientVsCodeRoot

    // The path to the test runner script, passed to --extensionTestsPath.
    const extensionTestsPath = path.resolve(
        clientVsCodeRoot,
        'dist',
        'tsc',
        'test',
        'integration',
        'index'
    )

    // Download VS Code, unzip it, and run the integration test.
    await runTests({
        version: '1.88.1',
        extensionDevelopmentPath,
        extensionTestsPath,
        launchArgs: [
            testWorkspacePath,
            '--disable-extensions', // disable other extensions
        ],
    })
}
main().catch(error => {
    console.error('Failed to run tests:', error)
    process.exit(1)
})
