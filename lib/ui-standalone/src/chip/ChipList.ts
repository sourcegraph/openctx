import type { Item } from '@openctx/schema'
import clsx from 'clsx'
import { createChip } from './Chip'
import styles from './ChipList.module.css'

/**
 * A list of OpenCtx chips.
 */
export function createChipList({
    items,
    className,
    chipClassName,
    popoverClassName,
}: {
    items: Item[]
    className?: string
    chipClassName?: string
    popoverClassName?: string
}): HTMLElement {
    const el = document.createElement('div')
    el.className = clsx(styles.list, className)

    for (const item of items) {
        el.append(createChip({ item, className: chipClassName, popoverClassName }))
    }

    return el
}
