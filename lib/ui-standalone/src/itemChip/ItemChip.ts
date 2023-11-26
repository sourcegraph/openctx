import { type OpenCodeGraphItem } from '@opencodegraph/schema'
import clsx from 'clsx'
import styles from './ItemChip.module.css'
import { getPopoverDimensions } from './popover'

/**
 * A single OpenCodeGraph item, displayed as a "chip".
 */
export function createItemChip({
    item,
    className,
    popoverClassName,
}: {
    item: OpenCodeGraphItem
    className?: string
    popoverClassName?: string
}): HTMLElement {
    const hasDetail = Boolean(item.detail || item.image || ((item.url || item.previewUrl) && item.preview))

    const el = document.createElement('aside')
    el.className = clsx(styles.item, hasDetail ? styles.itemHasDetail : null, className)

    const headerEl = document.createElement('header')

    const titleEl = document.createElement('h4')
    titleEl.className = styles.title
    titleEl.innerText = item.title
    headerEl.append(titleEl)

    if (item.url) {
        const linkEl = document.createElement('a')
        linkEl.className = styles.stretchedLink
        linkEl.ariaHidden = 'true'
        linkEl.href = item.url
        headerEl.append(linkEl)
    }

    if (item.url || hasDetail) {
        headerEl.tabIndex = 0
    }

    el.append(headerEl)

    if (hasDetail) {
        const popoverEl = document.createElement('div')
        popoverEl.popover = 'auto'
        popoverEl.className = styles.popover
        popoverEl.append(
            createPopoverContent({
                ...item,
                iframe: item.preview ? item.previewUrl ?? item.url : undefined,
                className: popoverClassName,
            })
        )

        // DOM event listeners are automatically removed when the element is removed, so we don't
        // need to track these elsewhere for cleanup.
        const showPopover = (): void => {
            // Need to call showPopover before getPopoverDimensions because it needs to be displayed
            // in order to calculate its dimensions.
            popoverEl.showPopover()

            const { top, left } = getPopoverDimensions(el, popoverEl)
            popoverEl.style.top = top
            popoverEl.style.left = left
        }
        const hidePopover = (): void => popoverEl.hidePopover()
        headerEl.addEventListener('mouseenter', showPopover)
        headerEl.addEventListener('mouseleave', hidePopover)
        headerEl.addEventListener('focus', showPopover)
        headerEl.addEventListener('blur', hidePopover)

        // Useful for debugging:
        //
        // setTimeout(() => showPopover())

        el.append(popoverEl)
    }

    return el
}

function createPopoverContent({
    title,
    detail,
    image,
    iframe,
    className,
}: Pick<OpenCodeGraphItem, 'title' | 'detail' | 'image'> & { iframe?: string; className?: string }): HTMLElement {
    const el = document.createElement('aside')
    el.className = clsx(styles.popoverContent, className)

    if (detail) {
        const detailEl = document.createElement('p')
        detailEl.className = styles.detail
        detailEl.innerText = detail
        el.append(detailEl)
    }
    if (image) {
        const imageContainerEl = document.createElement('div')
        imageContainerEl.className = styles.imageContainer

        const imageEl = document.createElement('img')
        imageEl.className = styles.image
        imageEl.src = image.url
        if (image.width) {
            imageEl.width = image.width
        }
        if (image.height) {
            imageEl.height = image.height
        }

        imageContainerEl.append(imageEl)
        el.append(imageContainerEl)
    }

    if (iframe) {
        const iframeContainerEl = document.createElement('div')
        iframeContainerEl.className = styles.iframeContainer

        const iframeEl = document.createElement('iframe')
        iframeEl.className = styles.iframe
        iframeEl.src = iframe
        iframeEl.title = title
        iframeEl.frameBorder = '0'
        iframeEl.scrolling = 'no'
        iframeEl.tabIndex = -1
        iframeEl.sandbox.add('allow-scripts', 'allow-same-origin')

        // Wait for the iframe to load before displaying it, to reduce visual flicker.
        const onIframeLoad = (): void => {
            iframeEl.classList.add(styles.iframeLoaded)
            iframeEl.removeEventListener('load', onIframeLoad)
        }
        iframeEl.addEventListener('load', onIframeLoad)

        iframeContainerEl.append(iframeEl)
        el.append(iframeContainerEl)
    }

    return el
}

/**
 * A list of OCG items.
 */
export function createItemChipList({
    items,
    className,
    chipClassName,
    popoverClassName,
}: {
    items: OpenCodeGraphItem[]
    className?: string
    chipClassName?: string
    popoverClassName?: string
}): HTMLElement {
    const el = document.createElement('div')
    el.className = clsx(styles.list, className)
    for (const item of items) {
        el.append(createItemChip({ item, className: chipClassName, popoverClassName }))
    }
    return el
}
