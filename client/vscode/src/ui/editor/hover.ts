import type { Annotation } from '@openctx/client'
import { firstValueFrom, map } from 'rxjs'
import * as vscode from 'vscode'
import type { Controller } from '../../controller'

export function createHoverProvider(controller: Controller): vscode.HoverProvider & vscode.Disposable {
    return {
        async provideHover(doc, pos): Promise<vscode.Hover | null> {
            return firstValueFrom(
                controller.observeAnnotations(doc).pipe(
                    map(anns => {
                        const containedByAnns = anns?.filter(ann =>
                            (ann.range ?? ZERO_RANGE).contains(pos)
                        )
                        return containedByAnns && containedByAnns.length > 0
                            ? createHover(containedByAnns)
                            : null
                    })
                )
            )
        },
        dispose() {
            /* noop */
        },
    }
}

const ZERO_RANGE = new vscode.Range(0, 0, 0, 0)

function createHover(anns: Annotation<vscode.Range>[]): vscode.Hover {
    const contents: vscode.Hover['contents'] = []
    for (const ann of anns) {
        const content = new vscode.MarkdownString()
        content.supportHtml = true

        // Render title in bold.
        content.appendMarkdown('**')
        content.appendText(ann.item.title)
        content.appendMarkdown('**')

        if (ann.item.ui?.hover?.markdown || ann.item.ui?.hover?.text) {
            content.appendMarkdown('\n\n')
            if (ann.item.ui.hover.markdown) {
                content.appendMarkdown(ann.item.ui.hover.markdown)
            } else if (ann.item.ui.hover.text) {
                content.appendText(ann.item.ui.hover.text)
            }
        }
        if (ann.item.url) {
            content.appendMarkdown('\n\n')
            content.appendMarkdown(`[Open in browser...](${ann.item.url})`)
        }

        contents.push(content)
    }

    return {
        contents,
        range: anns[0].range, // TODO(sqs): use smallest overlapping range
    }
}
