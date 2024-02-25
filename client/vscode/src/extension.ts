import * as vscode from 'vscode'
import type { ExtensionApi } from './api'
import { secretsChanges } from './authInfo'
import { createController } from './controller'

/**
 * Start the extension, watching all relevant configuration and secrets for changes.
 */
export function activate(
    context: Pick<vscode.ExtensionContext, 'secrets' | 'subscriptions'>,
    isOwnActivation = true
): ExtensionApi | null {
    // Support activating this extension from another extension, so that this extension and another
    // one can be developed at the same time.
    if (vscode.workspace.getConfiguration('openctx').get('dev.skipOwnActivation') === true) {
        if (isOwnActivation) {
            console.debug('OpenCtx: Skipping own activation.')
            return null
        }
        console.debug('OpenCtx: Activating from another extension.')
    }

    const outputChannel = vscode.window.createOutputChannel('OpenCtx')
    context.subscriptions.push(outputChannel)

    const { disposable: disposable0, observable: secrets } = secretsChanges(context.secrets)
    context.subscriptions.push(disposable0)

    const { disposable: disposable1, api } = createController(secrets, outputChannel)
    context.subscriptions.push(disposable1)

    return api
}
