import type { Annotation } from '@openctx/client'
import * as vscode from 'vscode'
import type { Controller } from '../controller'

const COMMAND_ID = 'openctx.showFileItems'

export function createShowFileItemsList(controller: Controller): vscode.Disposable {
    const disposables: vscode.Disposable[] = []

    disposables.push(vscode.commands.registerCommand(COMMAND_ID, () => showQuickPick(controller)))

    return vscode.Disposable.from(...disposables)
}

interface QuickPickItem extends vscode.QuickPickItem {
    ann: Annotation<vscode.Range> | null
}

async function showQuickPick(controller: Controller): Promise<void> {
    const editor = vscode.window.activeTextEditor
    if (!editor) {
        await vscode.window.showErrorMessage('No active text editor')
        return
    }

    const disposables: vscode.Disposable[] = []
    function disposeAll(): void {
        vscode.Disposable.from(...disposables).dispose()
    }

    const quickPick = vscode.window.createQuickPick<QuickPickItem>()
    disposables.push(quickPick)
    quickPick.title = 'OpenCtx Context for File'
    quickPick.busy = true
    quickPick.keepScrollPosition = false
    quickPick.matchOnDescription = true
    quickPick.matchOnDetail = true
    quickPick.show()

    const subscription = controller.observeAnnotations(editor.document).subscribe(
        anns => {
            quickPick.items =
                anns && anns.length > 0
                    ? toQuickPickItems(anns)
                    : [{ label: 'No OpenCtx annotations', ann: null }]
            quickPick.busy = false
        },
        error => {
            console.error(error)
            vscode.window.showErrorMessage('Error loading OpenCtx annotations')
            disposeAll()
        },
        () => disposeAll()
    )
    disposables.push({ dispose: () => subscription.unsubscribe() })

    disposables.push(
        quickPick.onDidChangeActive(activeItems => {
            const activeItem = activeItems.at(0)
            if (activeItem?.ann?.range) {
                editor.revealRange(
                    activeItem.ann.range,
                    vscode.TextEditorRevealType.InCenterIfOutsideViewport
                )
                editor.selection = new vscode.Selection(
                    activeItem.ann.range.start,
                    activeItem.ann.range.end
                )
            }
        })
    )

    disposables.push(
        quickPick.onDidAccept(() => {
            const selectedItem = quickPick.selectedItems[0]
            if (!selectedItem) {
                return
            }
            if (selectedItem.ann?.item.url) {
                vscode.commands.executeCommand('vscode.open', selectedItem.ann?.item.url)
            }
            quickPick.hide()
            disposeAll()
        })
    )

    disposables.push(
        quickPick.onDidTriggerItemButton(e => {
            if (e.item.ann?.item.url) {
                vscode.commands.executeCommand('vscode.open', e.item.ann.item.url)
            }
            disposeAll()
        })
    )

    disposables.push(
        quickPick.onDidHide(() => {
            disposeAll()
            subscription.unsubscribe()
        })
    )
}

type RequiredNotNull<T> = {
    [P in keyof T]-?: NonNullable<T[P]>
}

function toQuickPickItems(anns: Annotation<vscode.Range>[]): QuickPickItem[] {
    const qpItems: (QuickPickItem & RequiredNotNull<Pick<QuickPickItem, 'ann'>>)[] = []
    for (const ann of anns) {
        qpItems.push({
            label: ann.item.title,
            detail: ann.item.ui?.hover?.text,
            buttons: ann.item.url
                ? [{ tooltip: `Open ${ann.item.url}`, iconPath: new vscode.ThemeIcon('link-external') }]
                : undefined,
            ann,
        })
    }
    return qpItems.sort((a, b) =>
        (a.ann.range ?? ZERO_RANGE).start.compareTo((b.ann.range ?? ZERO_RANGE).start)
    )
}

const ZERO_RANGE = new vscode.Range(0, 0, 0, 0)
