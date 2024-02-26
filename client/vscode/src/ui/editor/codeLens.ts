import { type ItemWithRichRange, prepareItemsForPresentation } from '@openctx/ui-common'
import { type Observable, firstValueFrom, map } from 'rxjs'
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

    disposables.push(controller.onDidChangeProviders(() => changeCodeLenses.fire()))

    const provider = {
        onDidChangeCodeLenses: changeCodeLenses.event,
        observeCodeLenses(doc: vscode.TextDocument): Observable<CodeLens[]> {
            return controller
                .observeItems(doc)
                .pipe(
                    map(items =>
                        prepareItemsForPresentation<vscode.Range>(items ?? []).map(item =>
                            itemCodeLens(doc, item, showHover)
                        )
                    )
                )
        },
        async provideCodeLenses(doc: vscode.TextDocument): Promise<CodeLens[]> {
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
function itemCodeLens(
    doc: vscode.TextDocument,
    item: ItemWithRichRange<vscode.Range>,
    showHover: ReturnType<typeof createShowHoverCommand>
): CodeLens {
    const range = item.range ?? new vscode.Range(0, 0, 0, 0)
    return {
        range,
        command: {
            title: item.title,
            ...(item.ui?.hover && !item.ui.presentationHints?.includes('prefer-link-over-detail')
                ? showHover.createCommandArgs(doc.uri, range.start)
                : item.url
                  ? openWebBrowserCommandArgs(item.url)
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
