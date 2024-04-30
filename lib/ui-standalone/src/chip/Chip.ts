import type { Annotation } from '@openctx/schema'
import { renderHoverToHTML } from '@openctx/ui-common'
import { createBaseChip } from './BaseChip'

/**
 * A single OpenCtx annotation, displayed as a "chip".
 */
export function createChip({
    annotation: { item },
    className,
    popoverClassName,
}: {
    annotation: Annotation
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
