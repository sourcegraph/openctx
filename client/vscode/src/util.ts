import { Observable } from 'rxjs'
import * as vscode from 'vscode'

export function observeWorkspaceConfigurationChanges(
    section: string,
    scope?: vscode.ConfigurationScope
): Observable<void> {
    return new Observable(observer => {
        const disposable = vscode.workspace.onDidChangeConfiguration(e => {
            if (e.affectsConfiguration(section, scope)) {
                observer.next(undefined)
            }
        })
        observer.next(undefined)
        return () => disposable.dispose()
    })
}

export function toEventEmitter<T>(
    observable: Observable<T>
): vscode.EventEmitter<T> & vscode.Disposable {
    const emitter = new vscode.EventEmitter<T>()
    const sub = observable.subscribe({ next: v => emitter.fire(v) })
    return {
        event: emitter.event,
        fire: emitter.fire.bind(emitter),
        dispose(): void {
            emitter.dispose()
            sub.unsubscribe()
        },
    }
}
