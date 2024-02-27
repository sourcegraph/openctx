import { type EditorState, type Extension, RangeSetBuilder } from '@codemirror/state'
import { Decoration, type DecorationSet, EditorView, WidgetType } from '@codemirror/view'
import type { Annotation } from '@openctx/client'
import { prepareAnnotationsForPresentation } from '@openctx/ui-common'
import deepEqual from 'deep-equal'
import { type OpenCtxDecorationsConfig, openCtxDataFacet } from './extension'

class BlockWidget extends WidgetType {
    private container: HTMLElement | null = null
    private decoration: ReturnType<OpenCtxDecorationsConfig['createDecoration']> | undefined

    constructor(
        private readonly anns: Annotation[],
        private readonly indent: string | undefined,
        private readonly config: OpenCtxDecorationsConfig
    ) {
        super()
    }

    public eq(other: BlockWidget): boolean {
        return this.config.visibility === other.config.visibility && deepEqual(this.anns, other.anns)
    }

    public toDOM(): HTMLElement {
        if (!this.container) {
            this.container = document.createElement('div')
            this.decoration = this.config.createDecoration(this.container, {
                indent: this.indent,
                anns: this.anns,
            })
        }
        return this.container
    }

    public destroy(): void {
        this.container?.remove()
        // setTimeout seems necessary to prevent React from complaining that the
        // root is synchronously unmounted while rendering is in progress
        setTimeout(() => this.decoration?.destroy?.(), 0)
    }
}

function computeDecorations(
    state: EditorState,
    anns: Annotation[],
    config: OpenCtxDecorationsConfig
): DecorationSet {
    const builder = new RangeSetBuilder<Decoration>()

    const annsByLine: { line: number; anns: Annotation[] }[] = []
    for (const ann of prepareAnnotationsForPresentation(anns)) {
        let cur = annsByLine.at(-1)
        const startLine = ann.range?.start.line ?? 0
        if (!cur || cur.line !== startLine) {
            cur = { line: startLine, anns: [] }
            annsByLine.push(cur)
        }
        cur.anns.push(ann)
    }

    for (const { line: lineNum, anns } of annsByLine) {
        const line = state.doc.line(lineNum + 1)
        const indent = line.text.match(/^\s*/)?.[0]
        builder.add(
            line.from,
            line.from,
            Decoration.widget({
                widget: new BlockWidget(anns, indent, config),
            })
        )
    }

    return builder.finish()
}

export function openCtxWidgets(config: OpenCtxDecorationsConfig): Extension {
    return [
        EditorView.decorations.compute(['doc', openCtxDataFacet], state => {
            const data = state.facet(openCtxDataFacet)
            return computeDecorations(state, data, config)
        }),
    ]
}
