import * as assert from 'node:assert'
import { copyFile } from 'node:fs/promises'
import path from 'node:path'
import type { ClientConfiguration } from '@openctx/client'
import type { ExtensionApiForTesting } from '@openctx/vscode-lib'
import { before } from 'mocha'
import * as vscode from 'vscode'

const openctxDir = path.join(__dirname, '../../../../../..')
const scratchDir = process.env.OPENCTX_VSCODE_INTEGRATION_TEST_TMP_SCRATCH_DIR!
if (!scratchDir) {
    throw new Error('scratch dir not set')
}

suite('API', () => {
    let api: ExtensionApiForTesting
    before(async () => {
        api = await getExtension()
    })

    test('items', async () => {
        await updateOpenCtxSettings({
            enable: true,
            debug: true,
            providers: {
                [vscode.Uri.file(
                    path.join(openctxDir, 'provider/hello-world/dist/index.js')
                ).toString()]: true,
            },
        })
        assert.deepEqual(
            (await api.items({})).map(item => item.title),
            ['✨ Hello, world!']
        )
    })

    /**
     * To manually test these in a VS Code non-debug extension host:
     */
    testLoadProviderFromFile('commonjsExtProvider.cjs')
    testLoadProviderFromFile('commonjsProvider.js')
    testLoadProviderFromFile('esmExtProvider.mjs')
    testLoadProviderFromFile('esmProvider.js')
    function testLoadProviderFromFile(providerFilename: string) {
        test(`load provider from ${path.extname(providerFilename)} file`, async () => {
            const origProviderPath = path.join(
                openctxDir,
                'lib/client/src/providerClient/transport/testdata',
                providerFilename
            )

            const providerPath = path.join(scratchDir, providerFilename)
            await copyFile(origProviderPath, providerPath)

            await updateOpenCtxSettings({
                enable: true,
                debug: true,
                providers: {
                    [vscode.Uri.file(providerPath).toString()]: true,
                },
            })

            assert.deepEqual(
                (await api.meta({})).map(meta => meta.name),
                ['foo']
            )
        })
    }
})

async function getExtension(): Promise<ExtensionApiForTesting> {
    const ext = vscode.extensions.getExtension<ExtensionApiForTesting>('sourcegraph.openctx')
    assert.ok(ext, 'extension not found')
    const api = await ext.activate()
    return api
}

async function updateOpenCtxSettings(settings: ClientConfiguration): Promise<void> {
    const openctxSection = vscode.workspace.getConfiguration('openctx')
    for (const [key, value] of Object.entries(settings)) {
        await openctxSection.update(key, value, vscode.ConfigurationTarget.Global)
    }
}
