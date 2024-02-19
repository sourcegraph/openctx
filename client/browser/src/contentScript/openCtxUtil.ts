import type { Annotation } from '@openctx/client'
import type { createItemChipList } from '@openctx/ui-standalone'

export function annotationsByLine(
    annotations: Annotation[]
): { line: number; annotations: Annotation[] }[] {
    const byLine: { line: number; annotations: Annotation[] }[] = []
    for (const ann of annotations) {
        let cur = byLine.at(-1)
        if (!cur || cur.line !== ann.range.start.line) {
            cur = { line: ann.range.start.line, annotations: [] }
            byLine.push(cur)
        }
        cur.annotations.push(ann)
    }
    return byLine
}

export const LINE_CHIPS_CLASSNAME = 'octx-line-chips'

export function styledItemChipListParams(
    params: Omit<
        Parameters<typeof createItemChipList>[0],
        'className' | 'chipClassName' | 'popoverClassName'
    >
): Parameters<typeof createItemChipList>[0] {
    return {
        ...params,
        className: LINE_CHIPS_CLASSNAME,
        chipClassName: 'octx-chip',
        popoverClassName: 'octx-chip-popover',
    }
}
