import { type ExtensionApiForTesting, createController } from '@openctx/vscode-lib'
import * as vscode from 'vscode'
import { getAuthInfo, secretsChanges } from './authInfo.js'

/**
 * Start the extension, watching all relevant configuration and secrets for changes.
 */
export function activate(
    context: Pick<vscode.ExtensionContext, 'secrets' | 'subscriptions'>
): ExtensionApiForTesting | null {
    const outputChannel = vscode.window.createOutputChannel('OpenCtx')
    context.subscriptions.push(outputChannel)

    const { disposable: disposable0, observable: secrets } = secretsChanges(context.secrets)
    context.subscriptions.push(disposable0)

    const {
        controller: _controller,
        apiForTesting,
        disposable: disposable1,
    } = createController({
        secrets,
        outputChannel,
        getAuthInfo,
        features: {
            annotations: true,
            statusBar: true,
        },
    })
    context.subscriptions.push(disposable1)

    return apiForTesting
}
