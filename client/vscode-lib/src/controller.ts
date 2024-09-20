import {
    type AnnotationsParams,
    type AuthInfo,
    type Client,
    type ClientConfiguration,
    type ImportedProviderConfiguration,
    type ProviderMethodOptions,
    type Range,
    createClient,
} from '@openctx/client'
import {
    combineLatest,
    isObservableOrInteropObservable,
    mergeMap,
    promiseToObservable,
} from '@openctx/client/observable'
import { Observable, type ObservableLike, map } from 'observable-fns'
import * as vscode from 'vscode'
import { getClientConfiguration } from './configuration.js'
import { initializeOpenCtxGlobal } from './global.js'
import { type ExtensionApiForTesting, createApiForTesting } from './testing.js'
import { createCodeLensProvider } from './ui/editor/codeLens.js'
import { createHoverProvider } from './ui/editor/hover.js'
import { createShowFileItemsList } from './ui/fileItemsList.js'
import { createStatusBarItem } from './ui/statusBarItem.js'
import { ErrorReporterController, UserAction } from './util/errorReporter.js'
import { importProvider } from './util/importHelpers.js'
import { observeWorkspaceConfigurationChanges, toEventEmitter } from './util/observable.js'

type VSCodeClient = Client<vscode.Range>

export interface Controller
    extends Pick<
        VSCodeClient,
        | 'metaChanges'
        | 'meta'
        | 'mentionsChanges'
        | 'mentions'
        | 'itemsChanges'
        | 'items'
        | 'annotationsChanges'
        | 'annotations'
    > {}

export function createController({
    secrets: secretsInput,
    extensionId,
    outputChannel,
    getAuthInfo,
    features,
    providers,
    mergeConfiguration,
    preloadDelay,
}: {
    secrets:
        | Observable<vscode.SecretStorage>
        | ObservableLike<vscode.SecretStorage>
        | vscode.SecretStorage
    extensionId: string
    outputChannel: vscode.OutputChannel
    getAuthInfo?: (secrets: vscode.SecretStorage, providerUri: string) => Promise<AuthInfo | null>
    features: { annotations?: boolean; statusBar?: boolean }
    providers?: ObservableLike<ImportedProviderConfiguration[]>
    mergeConfiguration?: (configuration: ClientConfiguration) => Promise<ClientConfiguration>
    preloadDelay?: number
}): {
    controller: Controller
    apiForTesting: ExtensionApiForTesting
    disposable: vscode.Disposable
} {
    initializeOpenCtxGlobal()

    const disposables: vscode.Disposable[] = []

    const globalConfigurationChanges = observeWorkspaceConfigurationChanges('openctx')

    const secrets: Observable<vscode.SecretStorage> = isObservableOrInteropObservable(secretsInput)
        ? Observable.from(secretsInput)
        : Observable.of(secretsInput)

    // Watch for changes that could possibly affect configuration. This is overbroad because it does
    // not specify a config scope.
    const configOrSecretsChanged = toEventEmitter(
        combineLatest([globalConfigurationChanges, secrets]).pipe(map(() => undefined)),
    )
    disposables.push(configOrSecretsChanged)

    const getConfiguration = async (scope?: vscode.ConfigurationScope) => {
        const config = getClientConfiguration(scope)
        return mergeConfiguration ? await mergeConfiguration(config) : config
    }

    const toggleEnableCommand = vscode.commands.registerCommand('openctx.toggleEnable', async () => {
        const currentValue = (await getConfiguration()).enable
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
                mergeMap(() => promiseToObservable(getConfiguration(scope))),
            )
        },
        authInfo: getAuthInfo
            ? provider =>
                  secrets.pipe(mergeMap(secrets => promiseToObservable(getAuthInfo(secrets, provider))))
            : undefined,
        makeRange,
        logger: message => outputChannel.appendLine(message),
        importProvider,
        providers,
        preloadDelay,
    })
    disposables.push(client)

    // errorReporter contains a lot of logic and state on how we notify and log
    // errors, as well as state around if we should turn off a feature (see
    // skipIfImplicitAction)
    const errorReporter = new ErrorReporterController((error: any, providerUri: string | undefined) => {
        const prefix = `OpenCtx error (from provider ${providerUri ?? 'unknown'}): `
        console.error(prefix, error)
        const errorDetail = error.stack ? `${error} (stack trace follows)\n${error.stack}` : error
        outputChannel.appendLine(`${prefix}${errorDetail}`)
    })
    disposables.push(errorReporter)

    // Note: We distingiush between an explicit user action and an implicit
    // one. Explicit user actions should always run and return errors.
    // Implicit actions may not run if they are erroring a lot. Currently only
    // annotations is implicit.
    //
    // Note: the client swallows errors, so the observable methods will report
    // internal errors but the behaviour around skipping is poor.

    const clientAnnotations = errorReporter.wrapPromise(UserAction.Implicit, client.annotations)
    const clientAnnotationsChanges = errorReporter.wrapObservable(
        UserAction.Implicit,
        client.annotationsChanges,
    )

    /**
     * The controller is passed to UI feature providers for them to fetch data.
     */
    const controller: Controller = {
        meta: errorReporter.wrapPromise(UserAction.Explicit, client.meta),
        metaChanges: errorReporter.wrapObservable(UserAction.Explicit, client.metaChanges),

        mentions: errorReporter.wrapPromise(UserAction.Explicit, client.mentions),
        mentionsChanges: errorReporter.wrapObservable(UserAction.Explicit, client.mentionsChanges),

        items: errorReporter.wrapPromise(UserAction.Explicit, client.items),
        itemsChanges: errorReporter.wrapObservable(UserAction.Explicit, client.itemsChanges),

        annotations: async (params: AnnotationsParams, opts?: ProviderMethodOptions) => {
            if (ignoreDoc(params)) {
                return []
            }
            return await clientAnnotations(params, opts)
        },
        annotationsChanges(params: AnnotationsParams, opts?: ProviderMethodOptions) {
            if (ignoreDoc(params)) {
                return Observable.of([])
            }
            return clientAnnotationsChanges(params, opts)
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
            vscode.languages.registerHoverProvider({ scheme: '*' }, hoverProvider),
        )
    }

    return {
        controller,
        apiForTesting: createApiForTesting(controller),
        disposable: vscode.Disposable.from(...disposables),
    }
}

function ignoreDoc(params: AnnotationsParams): boolean {
    // Ignore:
    // - documents that are not in the editor (`output` is the VS Code output channel).
    // - very large documents
    return params.uri.startsWith('output:') || params.content.length > 1024 * 1024
}

function makeRange(range: Range): vscode.Range {
    return new vscode.Range(range.start.line, range.start.character, range.end.line, range.end.character)
}
