import {
    type AuthInfo,
    type Client,
    type ItemsParams,
    type MentionsParams,
    type MetaParams,
    type ProviderMethodOptions,
    type Range,
    createClient,
} from '@openctx/client'
import type { ImportedProviderConfiguration } from '@openctx/client/src/configuration.js'
import { type Observable, combineLatest, from, isObservable, map, mergeMap, of } from 'rxjs'
import * as vscode from 'vscode'
import { getClientConfiguration } from './configuration.js'
import { type ExtensionApiForTesting, createApiForTesting } from './testing.js'
import { createCodeLensProvider } from './ui/editor/codeLens.js'
import { createHoverProvider } from './ui/editor/hover.js'
import { createShowFileItemsList } from './ui/fileItemsList.js'
import { createStatusBarItem } from './ui/statusBarItem.js'
import { ErrorReporterController, UserAction } from './util/errorReporter.js'
import { importProvider } from './util/importHelpers.js'
import { observeWorkspaceConfigurationChanges, toEventEmitter } from './util/observable.js'

type VSCodeClient = Client<vscode.Range>

export interface Controller {
    observeMeta: VSCodeClient['metaChanges']
    meta: VSCodeClient['meta']

    observeMentions: VSCodeClient['mentionsChanges']
    mentions: VSCodeClient['mentions']

    observeItems: VSCodeClient['itemsChanges']
    items: VSCodeClient['items']

    observeAnnotations(
        doc: Pick<vscode.TextDocument, 'uri' | 'getText'>
    ): ReturnType<VSCodeClient['annotationsChanges']>
    annotations(
        doc: Pick<vscode.TextDocument, 'uri' | 'getText'>,
        opts?: ProviderMethodOptions
    ): ReturnType<VSCodeClient['annotations']>
}

export function createController({
    secrets: secretsInput,
    outputChannel,
    getAuthInfo,
    features,
    providers,
}: {
    secrets: Observable<vscode.SecretStorage> | vscode.SecretStorage
    outputChannel: vscode.OutputChannel
    getAuthInfo?: (secrets: vscode.SecretStorage, providerUri: string) => Promise<AuthInfo | null>
    features: { annotations?: boolean; statusBar?: boolean }
    providers?: ImportedProviderConfiguration[]
}): {
    controller: Controller
    apiForTesting: ExtensionApiForTesting
    disposable: vscode.Disposable
} {
    const disposables: vscode.Disposable[] = []

    const globalConfigurationChanges = observeWorkspaceConfigurationChanges('openctx')

    const secrets: Observable<vscode.SecretStorage> = isObservable(secretsInput)
        ? secretsInput
        : of(secretsInput)

    // Watch for changes that could possibly affect configuration. This is overbroad because it does
    // not specify a config scope.
    const configOrSecretsChanged = toEventEmitter(
        combineLatest([globalConfigurationChanges, secrets]).pipe(map(() => undefined))
    )
    disposables.push(configOrSecretsChanged)

    const toggleEnableCommand = vscode.commands.registerCommand('openctx.toggleEnable', async () => {
        const currentValue = getClientConfiguration().enable
        await vscode.workspace.getConfiguration('openctx').update('enable', !currentValue)
    })
    disposables.push(toggleEnableCommand)

    const statusBarItem = features.statusBar ? createStatusBarItem() : null
    if (statusBarItem) disposables.push(statusBarItem)

    const client = createClient<vscode.Range>({
        configuration: resource => {
            // TODO(sqs): support multi-root somehow. this currently only takes config from the 1st root.
            const scope = resource
                ? vscode.Uri.parse(resource)
                : vscode.workspace.workspaceFolders?.[0]?.uri
            return observeWorkspaceConfigurationChanges('openctx', scope).pipe(
                map(() => getClientConfiguration(scope))
            )
        },
        authInfo: getAuthInfo
            ? provider => secrets.pipe(mergeMap(secrets => from(getAuthInfo(secrets, provider))))
            : undefined,
        makeRange,
        logger: message => outputChannel.appendLine(message),
        importProvider,
        providers,
    })

    const showErrorNotification = async (providerUri: string | undefined, error: any) => {
        // TODO(keegan) try convert providerUri to a meta.name and an "Open
        // Settings" action.
        const message = providerUri
            ? `Error from OpenCtx provider ${providerUri}: ${error}`
            : `Error from OpenCtx: ${error}`
        const OPEN_LOG = 'Open Log'
        const action = await vscode.window.showErrorMessage(message, {
            title: OPEN_LOG,
        } satisfies vscode.MessageItem)
        if (action?.title === OPEN_LOG) {
            outputChannel.show()
        }
    }

    // errorReporter contains a lot of logic and state on how we notify and log
    // errors, as well as state around if we should turn off a feature (see
    // skipIfImplicitAction)
    const errorReporter = new ErrorReporterController(showErrorNotification, (error: any) => {
        outputChannel.appendLine(error)
    })
    disposables.push(errorReporter)

    // Note: We distingiush between an explicit user action and an implicit
    // one. Explicit user actions should always run and return errors.
    // Implicit actions may not run if they are erroring a lot. Currently only
    // annotations is implicit.

    /**
     * The controller is passed to UI feature providers for them to fetch data.
     */
    const controller: Controller = {
        observeMeta(params: MetaParams, optsInput?: ProviderMethodOptions) {
            const { opts, tapAndCatch } = errorReporter.getForObservable(UserAction.Explicit, optsInput)
            return client.metaChanges(params, opts).pipe(tapAndCatch)
        },
        async meta(params: MetaParams, optsInput?: ProviderMethodOptions) {
            const { opts, onfinally } = errorReporter.getForPromise(UserAction.Explicit, optsInput)
            return client.meta(params, opts).finally(onfinally)
        },
        observeMentions(params: MentionsParams, optsInput?: ProviderMethodOptions) {
            const { opts, tapAndCatch } = errorReporter.getForObservable(UserAction.Explicit, optsInput)
            return client.mentionsChanges(params, opts).pipe(tapAndCatch)
        },
        async mentions(params: MentionsParams, optsInput?: ProviderMethodOptions) {
            const { opts, onfinally } = errorReporter.getForPromise(UserAction.Explicit, optsInput)
            return client.mentions(params, opts).finally(onfinally)
        },
        observeItems(params: ItemsParams, optsInput?: ProviderMethodOptions) {
            const { opts, tapAndCatch } = errorReporter.getForObservable(UserAction.Explicit, optsInput)
            return client.itemsChanges(params, opts).pipe(tapAndCatch)
        },
        async items(params: ItemsParams, optsInput?: ProviderMethodOptions) {
            const { opts, onfinally } = errorReporter.getForPromise(UserAction.Explicit, optsInput)
            return client.items(params, opts).finally(onfinally)
        },

        observeAnnotations(doc: vscode.TextDocument, optsInput?: ProviderMethodOptions) {
            if (ignoreDoc(doc)) {
                return of([])
            }

            const { skipIfImplicitAction, opts, tapAndCatch } = errorReporter.getForObservable(
                UserAction.Implicit,
                optsInput
            )
            if (skipIfImplicitAction) {
                return of([])
            }

            return client
                .annotationsChanges(
                    {
                        uri: doc.uri.toString(),
                        content: doc.getText(),
                    },
                    opts
                )
                .pipe(tapAndCatch)
        },
        async annotations(doc: vscode.TextDocument, optsInput?: ProviderMethodOptions) {
            if (ignoreDoc(doc)) {
                return []
            }

            const { skipIfImplicitAction, opts, onfinally } = errorReporter.getForPromise(
                UserAction.Implicit,
                optsInput
            )
            if (skipIfImplicitAction) {
                return []
            }

            return client
                .annotations(
                    {
                        uri: doc.uri.toString(),
                        content: doc.getText(),
                    },
                    opts
                )
                .finally(onfinally)
        },
    }

    if (features.annotations) {
        // The UI feature providers (code lens and hover) should stay registered even if the global
        // `openctx.enable` value is `false` because it might be overridden to `true` at another
        // level of configuration. If the UI feature providers are invoked in a file where they're
        // disabled, the provider will quickly return no results.
        const codeLensProvider = createCodeLensProvider(controller)
        const hoverProvider = createHoverProvider(controller)
        const quickPickCommand = createShowFileItemsList(controller)
        disposables.push(
            codeLensProvider,
            hoverProvider,
            quickPickCommand,
            vscode.languages.registerCodeLensProvider({ scheme: '*' }, codeLensProvider),
            vscode.languages.registerHoverProvider({ scheme: '*' }, hoverProvider)
        )
    }

    return {
        controller,
        apiForTesting: createApiForTesting(controller),
        disposable: vscode.Disposable.from(...disposables),
    }
}

function ignoreDoc(doc: vscode.TextDocument): boolean {
    // Ignore:
    // - documents that are not in the editor (`output` is the VS Code output channel).
    // - very long documents
    return doc.uri.scheme === 'output' || doc.lineCount > 5000
}

function makeRange(range: Range): vscode.Range {
    return new vscode.Range(range.start.line, range.start.character, range.end.line, range.end.character)
}
