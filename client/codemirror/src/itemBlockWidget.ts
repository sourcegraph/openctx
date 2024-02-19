import { RangeSetBuilder, type EditorState, type Extension } from '@codemirror/state'
import { Decoration, EditorView, WidgetType, type DecorationSet } from '@codemirror/view'
import type { Annotation, Item } from '@openctx/client'
import deepEqual from 'deep-equal'
import { openCtxDataFacet, type OpenCtxDecorationsConfig } from './extension'

class BlockWidget extends WidgetType {
    private container: HTMLElement | null = null
    private decoration: ReturnType<OpenCtxDecorationsConfig['createDecoration']> | undefined

    constructor(
        private readonly items: Item[],
        private readonly indent: string | undefined,
        private readonly config: OpenCtxDecorationsConfig
    ) {
        super()
    }

    public eq(other: BlockWidget): boolean {
        return this.config.visibility === other.config.visibility && deepEqual(this.items, other.items)
    }

    public toDOM(): HTMLElement {
        if (!this.container) {
            this.container = document.createElement('div')
            this.decoration = this.config.createDecoration(this.container, {
                indent: this.indent,
                items: this.items,
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
    annotations: Annotation[],
    config: OpenCtxDecorationsConfig
): DecorationSet {
    const builder = new RangeSetBuilder<Decoration>()

    const annotationsByLine: { line: number; annotations: Annotation[] }[] = []
    for (const ann of annotations) {
        let cur = annotationsByLine.at(-1)
        if (!cur || cur.line !== ann.range.start.line) {
            cur = { line: ann.range.start.line, annotations: [] }
            annotationsByLine.push(cur)
        }
        cur.annotations.push(ann)
    }

    for (const { line: lineNum, annotations } of annotationsByLine) {
        const lineItems = annotations.map(ann => ann.item)
        const line = state.doc.line(lineNum + 1)
        const indent = line.text.match(/^\s*/)?.[0]
        builder.add(
            line.from,
            line.from,
            Decoration.widget({
                widget: new BlockWidget(lineItems, indent, config),
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
