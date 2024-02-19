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
                        const containedByAnns = anns?.filter(ann => ann.range.contains(pos))
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

function createHover(anns: Annotation<vscode.Range>[]): vscode.Hover {
    const contents: vscode.Hover['contents'] = []
    for (const { item } of anns) {
        contents.push(
            new vscode.MarkdownString(item.title.includes('*') ? item.title : `**${item.title}**`)
        )
        if (item.detail) {
            contents.push(new vscode.MarkdownString(item.detail))
        }
        if (item.image) {
            // Scale down image dimensions so the image isn't too big.
            const MAX_WIDTH = 400
            let width = item.image.width ?? MAX_WIDTH
            let height = item.image.height
            if (width > MAX_WIDTH) {
                const origWidth = width
                width = MAX_WIDTH
                height = height ? Math.round(height * (MAX_WIDTH / origWidth)) : undefined
            }

            const m = new vscode.MarkdownString(
                `<img src="${encodeURI(item.image.url)}" width="${width}" height="${height ?? 'auto'}" ${
                    item.image.alt ? `alt="${item.image.alt}"` : ''
                } />`
            )
            m.supportHtml = true
            contents.push(m)
        }
        if (item.url) {
            contents.push(new vscode.MarkdownString(`[Open in browser...](${item.url})`))
        }
    }

    return {
        contents,
        range: anns[0].range, // TODO(sqs): use smallest overlapping range
    }
}
