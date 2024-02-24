import type { Item } from '@openctx/schema'
import { renderHoverToHTML } from '@openctx/ui-common'
import { createBaseChip } from './BaseChip'

/**
 * A single OpenCtx item, displayed as a "chip".
 */
export function createChip({
    item,
    className,
    popoverClassName,
}: {
    item: Item
    className?: string
    popoverClassName?: string
}): HTMLElement {
    let popover: HTMLElement | undefined

    const renderedHover = renderHoverToHTML(item.ui?.hover)
    if (renderedHover) {
        const hoverEl = document.createElement('div')
        if (renderedHover.format === 'text') {
            hoverEl.innerText = renderedHover.value
        } else {
            // Input is sanitized by renderHoverToHTML.
            hoverEl.innerHTML = renderedHover.value
        }
        popover = hoverEl
    }

    return createBaseChip({
        title: item.title,
        url: item.url,
        className,
        popover,
        popoverClassName,
    })
}
