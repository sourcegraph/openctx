import {
    type AuthInfo,
    type Client,
    type ClientConfiguration,
    type ProviderMethodOptions,
    type Range,
    createClient,
} from '@openctx/client'
import type { ImportedProviderConfiguration } from '@openctx/client/src/configuration.js'
import { type Observable, combineLatest, from, isObservable, map, mergeMap, of } from 'rxjs'
import * as vscode from 'vscode'
import { getClientConfiguration } from './configuration.js'
import { initializeOpenCtxGlobal } from './global.js'
import { type ExtensionApiForTesting, createApiForTesting } from './testing.js'
import { createCodeLensProvider } from './ui/editor/codeLens.js'
import { createHoverProvider } from './ui/editor/hover.js'
import { createShowFileItemsList } from './ui/fileItemsList.js'
import { createStatusBarItem } from './ui/statusBarItem.js'
import { Cache, bestEffort } from './util/cache.js'
import { ErrorReporterController, UserAction } from './util/errorReporter.js'
import { importProvider } from './util/importHelpers.js'
import { observeWorkspaceConfigurationChanges, toEventEmitter } from './util/observable.js'

type VSCodeClient = Client<vscode.Range>

export interface Controller {
    observeMeta: VSCodeClient['metaChanges']
    meta: VSCodeClient['meta']
    metaChanges__asyncGenerator: VSCodeClient['metaChanges__asyncGenerator']

    observeMentions: VSCodeClient['mentionsChanges']
    mentions: VSCodeClient['mentions']
    mentionsChanges__asyncGenerator: VSCodeClient['mentionsChanges__asyncGenerator']

    observeItems: VSCodeClient['itemsChanges']
    items: VSCodeClient['items']
    itemsChanges__asyncGenerator: VSCodeClient['itemsChanges__asyncGenerator']

    observeAnnotations(
        doc: Pick<vscode.TextDocument, 'uri' | 'getText'>,
    ): ReturnType<VSCodeClient['annotationsChanges']>
    annotations(
        doc: Pick<vscode.TextDocument, 'uri' | 'getText'>,
        opts?: ProviderMethodOptions,
    ): ReturnType<VSCodeClient['annotations']>
    annotationsChanges__asyncGenerator(
        doc: Pick<vscode.TextDocument, 'uri' | 'getText'>,
        opts?: ProviderMethodOptions,
        signal?: AbortSignal,
    ): ReturnType<VSCodeClient['annotationsChanges__asyncGenerator']>
}

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
    secrets: Observable<vscode.SecretStorage> | vscode.SecretStorage
    extensionId: string
    outputChannel: vscode.OutputChannel
    getAuthInfo?: (secrets: vscode.SecretStorage, providerUri: string) => Promise<AuthInfo | null>
    features: { annotations?: boolean; statusBar?: boolean }
    providers?: ImportedProviderConfiguration[]
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

    const secrets: Observable<vscode.SecretStorage> = isObservable(secretsInput)
        ? secretsInput
        : of(secretsInput)

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
                mergeMap(() => from(getConfiguration(scope))),
            )
        },
        authInfo: getAuthInfo
            ? provider => secrets.pipe(mergeMap(secrets => from(getAuthInfo(secrets, provider))))
            : undefined,
        makeRange,
        logger: message => outputChannel.appendLine(message),
        importProvider,
        providers,
        preloadDelay,
    })
    disposables.push(client)

    const errorLog = (error: any) => {
        console.error(error)
        outputChannel.appendLine(error)
    }

    // errorReporter contains a lot of logic and state on how we notify and log
    // errors, as well as state around if we should turn off a feature (see
    // skipIfImplicitAction)
    const errorReporter = new ErrorReporterController(
        createErrorNotifier(outputChannel, extensionId, client),
        errorLog,
    )
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
    const clientAnnotationsChanges__asyncGenerator = errorReporter.wrapAsyncGenerator(
        UserAction.Implicit,
        client.annotationsChanges__asyncGenerator,
    )

    /**
     * The controller is passed to UI feature providers for them to fetch data.
     */
    const controller: Controller = {
        meta: errorReporter.wrapPromise(UserAction.Explicit, client.meta),
        observeMeta: errorReporter.wrapObservable(UserAction.Explicit, client.metaChanges),
        metaChanges__asyncGenerator: errorReporter.wrapAsyncGenerator(
            UserAction.Explicit,
            client.metaChanges__asyncGenerator,
        ),

        mentions: errorReporter.wrapPromise(UserAction.Explicit, client.mentions),
        observeMentions: errorReporter.wrapObservable(UserAction.Explicit, client.mentionsChanges),
        mentionsChanges__asyncGenerator: errorReporter.wrapAsyncGenerator(
            UserAction.Explicit,
            client.mentionsChanges__asyncGenerator,
        ),

        items: errorReporter.wrapPromise(UserAction.Explicit, client.items),
        observeItems: errorReporter.wrapObservable(UserAction.Explicit, client.itemsChanges),
        itemsChanges__asyncGenerator: errorReporter.wrapAsyncGenerator(
            UserAction.Explicit,
            client.itemsChanges__asyncGenerator,
        ),

        async annotations(doc: vscode.TextDocument, opts?: ProviderMethodOptions) {
            if (ignoreDoc(doc)) {
                return []
            }
            return await clientAnnotations(
                {
                    uri: doc.uri.toString(),
                    content: doc.getText(),
                },
                opts,
            )
        },
        observeAnnotations(doc: vscode.TextDocument, opts?: ProviderMethodOptions) {
            if (ignoreDoc(doc)) {
                return of([])
            }

            return clientAnnotationsChanges(
                {
                    uri: doc.uri.toString(),
                    content: doc.getText(),
                },
                opts,
            )
        },
        async *annotationsChanges__asyncGenerator(
            doc: vscode.TextDocument,
            opts?: ProviderMethodOptions,
            signal?: AbortSignal,
        ) {
            if (ignoreDoc(doc)) {
                return
            }

            const g = clientAnnotationsChanges__asyncGenerator(
                {
                    uri: doc.uri.toString(),
                    content: doc.getText(),
                },
                opts,
                signal,
            )
            for await (const v of g) {
                yield v
            }
            return
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

function ignoreDoc(doc: vscode.TextDocument): boolean {
    // Ignore:
    // - documents that are not in the editor (`output` is the VS Code output channel).
    // - very long documents
    return doc.uri.scheme === 'output' || doc.lineCount > 5000
}

function makeRange(range: Range): vscode.Range {
    return new vscode.Range(range.start.line, range.start.character, range.end.line, range.end.character)
}

function createErrorNotifier(
    outputChannel: vscode.OutputChannel,
    extensionId: string,
    client: Pick<VSCodeClient, 'meta'>,
) {
    // Fetching the name can be slow or fail. So we use a cache + timeout when
    // getting the name of a provider.
    const nameCache = new Cache<string>({ ttlMs: 10 * 1000 })
    const getName = async (providerUri: string | undefined) => {
        if (providerUri === undefined) {
            return undefined
        }
        const fill = async () => {
            const meta = await bestEffort(client.meta({}, { providerUri: providerUri }), {
                defaultValue: [],
                delay: 250,
            })
            return meta.pop()?.name ?? providerUri
        }
        return await nameCache.getOrFill(providerUri, fill)
    }

    const actionItems = [
        {
            title: 'Show Logs',
            do: () => {
                outputChannel.show()
            },
        },
        {
            title: 'Open Settings',
            do: () => {
                vscode.commands.executeCommand('workbench.action.openSettings', {
                    query: `@ext:${extensionId} openctx.providers`,
                })
            },
        },
    ] satisfies (vscode.MessageItem & { do: () => void })[]

    return async (providerUri: string | undefined, error: any) => {
        const name = await getName(providerUri)
        const message = name
            ? `Error from OpenCtx provider "${name}": ${error}`
            : `Error from OpenCtx: ${error}`
        const action = await vscode.window.showErrorMessage(message, ...actionItems)
        if (action) {
            action.do()
        }
    }
}
