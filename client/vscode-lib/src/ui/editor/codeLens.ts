import { type AnnotationWithRichRange, prepareAnnotationsForPresentation } from '@openctx/ui-common'
import { type Observable, type Subscription, firstValueFrom, map, shareReplay } from 'rxjs'
import * as vscode from 'vscode'
import type { Controller } from '../../controller'

interface CodeLens extends vscode.CodeLens {}

export function createCodeLensProvider(controller: Controller): vscode.CodeLensProvider<CodeLens> & {
    observeCodeLenses(doc: vscode.TextDocument): Observable<CodeLens[]>
} & vscode.Disposable {
    const disposables: vscode.Disposable[] = []

    const showHover = createShowHoverCommand()
    disposables.push(showHover)

    const changeCodeLenses = new vscode.EventEmitter<void>()
    disposables.push(changeCodeLenses)

    const codeLensByDoc = new Map<
        string /* uri */,
        { observable: Observable<CodeLens[]>; subscription: Subscription }
    >()
    disposables.push(
        vscode.workspace.onDidCloseTextDocument(doc => {
            const entry = codeLensByDoc.get(doc.uri.toString())
            if (entry) {
                entry.subscription.unsubscribe()
                codeLensByDoc.delete(doc.uri.toString())
            }
        })
    )
    disposables.push({
        dispose: () => {
            for (const [, { subscription }] of codeLensByDoc) {
                subscription.unsubscribe()
            }
            codeLensByDoc.clear()
        },
    })

    const provider = {
        onDidChangeCodeLenses: changeCodeLenses.event,
        observeCodeLenses(doc: vscode.TextDocument): Observable<CodeLens[]> {
            const entry = codeLensByDoc.get(doc.uri.toString())
            if (entry) {
                return entry.observable
            }

            const observable = controller.observeAnnotations(doc).pipe(
                map(anns =>
                    prepareAnnotationsForPresentation<vscode.Range>(anns ?? []).map(item =>
                        annotationCodeLens(doc, item, showHover)
                    )
                ),
                shareReplay({ bufferSize: 1, refCount: true })
            )
            const subscription = observable.subscribe({
                next: () => changeCodeLenses.fire(),
                error: () => changeCodeLenses.fire(),
                complete: () => changeCodeLenses.fire(),
            })

            codeLensByDoc.set(doc.uri.toString(), { observable, subscription })

            return observable
        },
        provideCodeLenses(doc: vscode.TextDocument): Promise<CodeLens[]> {
            return firstValueFrom(provider.observeCodeLenses(doc), { defaultValue: [] })
        },
        dispose() {
            for (const disposable of disposables) {
                disposable.dispose()
            }
        },
    }
    return provider
}

/** Create a code lens for a single item. */
function annotationCodeLens(
    doc: vscode.TextDocument,
    ann: AnnotationWithRichRange<vscode.Range>,
    showHover: ReturnType<typeof createShowHoverCommand>
): CodeLens {
    const range = ann.range ?? new vscode.Range(0, 0, 0, 0)
    return {
        range,
        command: {
            title: ann.item.title,
            ...(ann.item.ui?.hover && !ann.presentationHints?.includes('prefer-link-over-detail')
                ? showHover.createCommandArgs(doc.uri, range.start)
                : ann.item.url
                  ? openWebBrowserCommandArgs(ann.item.url)
                  : { command: 'noop' }),
        },
        isResolved: true,
    }
}

function createShowHoverCommand(): {
    createCommandArgs: (
        uri: vscode.Uri,
        pos: vscode.Position
    ) => Pick<vscode.Command, 'command' | 'arguments'>
} & vscode.Disposable {
    const COMMAND_ID = 'openctx._showHover'
    const disposable = vscode.commands.registerCommand(
        COMMAND_ID,
        (uri: vscode.Uri, pos: vscode.Position): void => {
            const editor = vscode.window.activeTextEditor
            if (!editor || editor.document.uri.toString() !== uri.toString()) {
                return
            }
            editor.selections = [new vscode.Selection(pos, pos)]
            void vscode.commands.executeCommand('editor.action.showHover')
        }
    )
    return {
        createCommandArgs(uri, pos) {
            return {
                command: COMMAND_ID,
                arguments: [uri, pos],
            }
        },
        dispose() {
            disposable.dispose()
        },
    }
}

function openWebBrowserCommandArgs(url: string): Pick<vscode.Command, 'command' | 'arguments'> {
    return {
        command: 'vscode.open',
        arguments: [vscode.Uri.parse(url)],
    }
}
