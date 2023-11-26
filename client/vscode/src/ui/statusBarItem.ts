import * as vscode from 'vscode'

export function createStatusBarItem(): vscode.Disposable {
    const disposables: vscode.Disposable[] = []

    const statusItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right)
    disposables.push(statusItem)

    statusItem.command = 'opencodegraph.toggleEnable'

    function update(): void {
        const enable = vscode.workspace.getConfiguration('opencodegraph').get<boolean>('enable')
        if (enable) {
            statusItem.text = '$(ocg-logo)'
            statusItem.tooltip = 'Disable OpenCodeGraph'
        } else {
            statusItem.text = '$(ocg-logo-off)'
            statusItem.tooltip = 'Enable OpenCodeGraph'
        }
    }

    disposables.push(
        vscode.workspace.onDidChangeConfiguration(e => {
            if (e.affectsConfiguration('opencodegraph.enable')) {
                update()
            }
        })
    )
    update()
    statusItem.show()

    return vscode.Disposable.from(...disposables)
}
