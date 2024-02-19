import { type Annotation } from '@openctx/client'
import { firstValueFrom, map } from 'rxjs'
import * as vscode from 'vscode'
import { type Controller } from '../../controller'

interface CodeLens extends vscode.CodeLens {}

export function createCodeLensProvider(controller: Controller): vscode.CodeLensProvider<CodeLens> & vscode.Disposable {
    const disposables: vscode.Disposable[] = []

    const showHover = createShowHoverCommand()
    disposables.push(showHover)

    const changeCodeLenses = new vscode.EventEmitter<void>()
    disposables.push(changeCodeLenses)

    disposables.push(controller.onDidChangeProviders(() => changeCodeLenses.fire()))

    return {
        onDidChangeCodeLenses: changeCodeLenses.event,
        async provideCodeLenses(doc: vscode.TextDocument): Promise<CodeLens[]> {
            return firstValueFrom(
                controller
                    .observeAnnotations(doc)
                    .pipe(map(anns => anns?.map(ann => createCodeLens(doc, ann, showHover)) ?? [])),
                { defaultValue: [] }
            )
        },
        dispose() {
            for (const disposable of disposables) {
                disposable.dispose()
            }
        },
    }
}

function createCodeLens(
    doc: vscode.TextDocument,
    { item, range }: Annotation<vscode.Range>,
    showHover: ReturnType<typeof createShowHoverCommand>
): CodeLens {
    return {
        range,
        command: {
            title: item.title,
            tooltip: item.detail,
            ...(item.image
                ? showHover.createCommandArgs(doc.uri, range.start)
                : item.url
                ? openWebBrowserCommandArgs(item.url)
                : { command: 'noop' }),
        },
        isResolved: true,
    }
}

function createShowHoverCommand(): {
    createCommandArgs: (uri: vscode.Uri, pos: vscode.Position) => Pick<vscode.Command, 'command' | 'arguments'>
} & vscode.Disposable {
    const COMMAND_ID = 'openctx._showHover'
    const disposable = vscode.commands.registerCommand(COMMAND_ID, (uri: vscode.Uri, pos: vscode.Position) => {
        const editor = vscode.window.activeTextEditor
        if (!editor || editor.document.uri.toString() !== uri.toString()) {
            return
        }
        editor.selections = [new vscode.Selection(pos, pos)]
        // eslint-disable-next-line no-void
        void vscode.commands.executeCommand('editor.action.showHover')
    })
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
