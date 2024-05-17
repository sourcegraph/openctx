import * as assert from 'assert'
import type { ExtensionApiForTesting } from '@openctx/vscode-lib'
import * as vscode from 'vscode'

suite('API', () => {
    test('get exported extension API', async () => {
        // Wait for the extension to become ready.
        const ext = vscode.extensions.getExtension<ExtensionApiForTesting>('sourcegraph.openctx')
        assert.ok(ext, 'extension not found')

        const api = await ext.activate()

        assert.deepEqual(
            (await api.getItems({}))?.map(item => item.title),
            ['✨ Hello, world!', 'Bazel at Sourcegraph', 'View all Storybooks']
        )
    })
})
