import type { Annotation } from '@openctx/schema'
import clsx from 'clsx'
import { createChip } from './Chip'
import styles from './ChipList.module.css'

/**
 * A list of OpenCtx annotations (displayed as "chips").
 */
export function createChipList({
    annotations,
    className,
    chipClassName,
    popoverClassName,
}: {
    annotations: Annotation[]
    className?: string
    chipClassName?: string
    popoverClassName?: string
}): HTMLElement {
    const el = document.createElement('div')
    el.className = clsx(styles.list, className)

    for (const ann of annotations) {
        el.append(createChip({ annotation: ann, className: chipClassName, popoverClassName }))
    }

    return el
}
