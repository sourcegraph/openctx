import {
    type AuthInfo,
    type Client,
    type ItemsParams,
    type MentionsParams,
    type MetaParams,
    type Range,
    createClient,
} from '@openctx/client'
import {
    type Observable,
    type TapObserver,
    catchError,
    combineLatest,
    from,
    isObservable,
    map,
    mergeMap,
    of,
    tap,
} from 'rxjs'
import * as vscode from 'vscode'
import { getClientConfiguration } from './configuration.js'
import { type ExtensionApiForTesting, createApiForTesting } from './testing.js'
import { createCodeLensProvider } from './ui/editor/codeLens.js'
import { createHoverProvider } from './ui/editor/hover.js'
import { createShowFileItemsList } from './ui/fileItemsList.js'
import { createStatusBarItem } from './ui/statusBarItem.js'
import { createErrorWaiter } from './util/errorWaiter.js'
import { importProvider } from './util/importHelpers.js'
import { observeWorkspaceConfigurationChanges, toEventEmitter } from './util/observable.js'

export type VSCodeClient = Client<vscode.Range>

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
        providerUri?: string
    ): ReturnType<VSCodeClient['annotations']>

    client: Client<vscode.Range>
}

export function createController({
    secrets: secretsInput,
    outputChannel,
    getAuthInfo,
    features,
}: {
    secrets: Observable<vscode.SecretStorage> | vscode.SecretStorage
    outputChannel: vscode.OutputChannel
    getAuthInfo?: (secrets: vscode.SecretStorage, providerUri: string) => Promise<AuthInfo | null>
    features: { annotations?: boolean; statusBar?: boolean }
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

    // Pause for 10 seconds if we get 5 errors in a row.
    const errorWaiter = createErrorWaiter(10 * 1000, 5)
    disposables.push(errorWaiter)

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
    })

    const errorTapObserver: Partial<TapObserver<any>> = {
        next(): void {
            errorWaiter.gotError(false)
        },
        error(): void {
            // Show an error notification unless we've recently shown one (to avoid annoying
            // the user).
            const shouldNotify = errorWaiter.timeSinceLastError() > 1000 * 60 * 15 /* 15 min */
            if (shouldNotify) {
                showErrorNotification(outputChannel)
            }

            errorWaiter.gotError(true)
        },
    }
    const errorCatcher = <T = any>(error: any): Observable<T[]> => {
        outputChannel.appendLine(error)
        return of([])
    }

    /**
     * The controller is passed to UI feature providers for them to fetch data.
     */
    const controller: Controller = {
        observeMeta(params: MetaParams, providerUri?: string) {
            if (!errorWaiter.ok()) {
                return of([])
            }
            return client
                .metaChanges(params, providerUri)
                .pipe(tap(errorTapObserver), catchError(errorCatcher))
        },
        async meta(params: MetaParams, providerUri?: string) {
            if (!errorWaiter.ok()) {
                return []
            }
            return client.meta(params, providerUri)
        },
        observeMentions(params: MentionsParams, providerUri?: string) {
            if (!errorWaiter.ok()) {
                return of([])
            }
            return client
                .mentionsChanges(params, providerUri)
                .pipe(tap(errorTapObserver), catchError(errorCatcher))
        },
        async mentions(params: MentionsParams, providerUri?: string) {
            if (!errorWaiter.ok()) {
                return []
            }
            return client.mentions(params, providerUri)
        },
        observeItems(params: ItemsParams, providerUri?: string) {
            if (!errorWaiter.ok()) {
                return of([])
            }
            return client
                .itemsChanges(params, providerUri)
                .pipe(tap(errorTapObserver), catchError(errorCatcher))
        },
        async items(params: ItemsParams, providerUri?: string) {
            if (!errorWaiter.ok()) {
                return []
            }
            return client.items(params, providerUri)
        },

        observeAnnotations(doc: vscode.TextDocument, providerUri?: string) {
            if (ignoreDoc(doc) || !errorWaiter.ok()) {
                return of([])
            }
            return client
                .annotationsChanges(
                    {
                        uri: doc.uri.toString(),
                        content: doc.getText(),
                    },
                    providerUri
                )
                .pipe(tap(errorTapObserver), catchError(errorCatcher))
        },
        async annotations(doc: vscode.TextDocument, providerUri?: string) {
            if (ignoreDoc(doc) || !errorWaiter.ok()) {
                return []
            }
            return client.annotations(
                {
                    uri: doc.uri.toString(),
                    content: doc.getText(),
                },
                providerUri
            )
        },

        client,
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

function showErrorNotification(outputChannel: vscode.OutputChannel): void {
    const OPEN_LOG = 'Open Log'
    vscode.window
        .showErrorMessage('OpenCtx items failed.', {
            title: OPEN_LOG,
        } satisfies vscode.MessageItem)
        .then(action => {
            if (action?.title === OPEN_LOG) {
                outputChannel.show()
            }
        })
}
