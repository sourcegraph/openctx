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
import { createErrorReporter } from './util/errorReporter.js'
import { createErrorWaiter } from './util/errorWaiter.js'
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

    // Pause for 10 seconds if we get 5 errors in a row.
    const errorDelay = 10 * 1000
    const errorThreshold = 5
    const errorWaiterMeta = createErrorWaiter(errorDelay, errorThreshold)
    const errorWaiterMentions = createErrorWaiter(errorDelay, errorThreshold)
    const errorWaiterItems = createErrorWaiter(errorDelay, errorThreshold)
    const errorWaiterAnnotations = createErrorWaiter(errorDelay, errorThreshold)
    disposables.push(errorWaiterMeta, errorWaiterMentions, errorWaiterItems, errorWaiterAnnotations)

    const errorReporterMeta = createErrorReporter(
        outputChannel,
        errorWaiterMeta,
        'OpenCtx provider failed initializing.'
    )
    const errorReporterMentions = createErrorReporter(
        outputChannel,
        errorWaiterMentions,
        'OpenCtx provider failed to fetch mentions.'
    )
    const errorReporterItems = createErrorReporter(
        outputChannel,
        errorWaiterItems,
        'OpenCtx provider failed to hydrate mention items.'
    )
    const errorReporterAnnotations = createErrorReporter(
        outputChannel,
        errorWaiterAnnotations,
        'OpenCtx provider failed to get annotations.'
    )

    /**
     * The controller is passed to UI feature providers for them to fetch data.
     */
    const controller: Controller = {
        observeMeta(params: MetaParams, opts?: ProviderMethodOptions) {
            if (!errorWaiterMeta.ok()) {
                return of([])
            }
            return client
                .metaChanges(params, errorReporterMeta.withObserveOpts(opts))
                .pipe(errorReporterMeta.tapAndCatch)
        },
        async meta(params: MetaParams, optsInput?: ProviderMethodOptions) {
            if (!errorWaiterMeta.ok()) {
                return []
            }
            const { opts, onfinally } = errorReporterMeta.withPromiseOpts(optsInput)
            return client.meta(params, opts).finally(onfinally)
        },
        observeMentions(params: MentionsParams, opts?: ProviderMethodOptions) {
            if (!errorWaiterMentions.ok()) {
                return of([])
            }
            return client
                .mentionsChanges(params, errorReporterMentions.withObserveOpts(opts))
                .pipe(errorReporterMentions.tapAndCatch)
        },
        async mentions(params: MentionsParams, optsInput?: ProviderMethodOptions) {
            if (!errorWaiterMentions.ok()) {
                return []
            }
            const { opts, onfinally } = errorReporterMentions.withPromiseOpts(optsInput)
            return client.mentions(params, opts).finally(onfinally)
        },
        observeItems(params: ItemsParams, opts?: ProviderMethodOptions) {
            if (!errorWaiterItems.ok()) {
                return of([])
            }
            return client
                .itemsChanges(params, errorReporterItems.withObserveOpts(opts))
                .pipe(errorReporterItems.tapAndCatch)
        },
        async items(params: ItemsParams, optsInput?: ProviderMethodOptions) {
            if (!errorWaiterItems.ok()) {
                return []
            }
            const { opts, onfinally } = errorReporterItems.withPromiseOpts(optsInput)
            return client.items(params, opts).finally(onfinally)
        },

        observeAnnotations(doc: vscode.TextDocument, opts?: ProviderMethodOptions) {
            if (ignoreDoc(doc) || !errorWaiterAnnotations.ok()) {
                return of([])
            }
            return client
                .annotationsChanges(
                    {
                        uri: doc.uri.toString(),
                        content: doc.getText(),
                    },
                    errorReporterAnnotations.withObserveOpts(opts)
                )
                .pipe(errorReporterAnnotations.tapAndCatch)
        },
        async annotations(doc: vscode.TextDocument, optsInput?: ProviderMethodOptions) {
            if (ignoreDoc(doc) || !errorWaiterAnnotations.ok()) {
                return []
            }
            const { opts, onfinally } = errorReporterAnnotations.withPromiseOpts(optsInput)
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
