import { type Item } from '@opencodegraph/schema'
import classNames from 'classnames'
import React, { useCallback, useRef, useState } from 'react'
import styles from './ItemChip.module.css'
import { Popover } from './Popover'

/**
 * A single OpenCodeGraph item, displayed as a "chip".
 */
export const ItemChip: React.FunctionComponent<{
    item: Item
    className?: string
    popoverClassName?: string
}> = ({ item, className, popoverClassName }) => {
    const hasDetail = Boolean(item.detail || item.image || ((item.url || item.previewUrl) && item.preview))

    const [popoverVisible, setPopoverVisible] = useState(false)
    const showPopover = useCallback((): void => setPopoverVisible(true), [])
    const hidePopover = useCallback((): void => setPopoverVisible(false), [])

    const anchorRef = useRef<HTMLElement>(null)

    return (
        <aside className={classNames(styles.item, hasDetail ? styles.itemHasDetail : null, className)} ref={anchorRef}>
            <header onMouseEnter={showPopover} onMouseLeave={hidePopover} onFocus={showPopover} onBlur={hidePopover}>
                <ItemTitle title={item.title} />
                {item.url && <a className={styles.stretchedLink} aria-hidden={true} href={item.url} />}
            </header>
            {hasDetail && anchorRef.current && (
                <Popover anchor={anchorRef.current} visible={popoverVisible}>
                    <aside className={classNames(styles.popoverContent, popoverClassName)}>
                        <ItemDetail
                            title={item.title}
                            detail={item.detail}
                            image={item.image}
                            iframe={item.preview ? item.previewUrl ?? item.url : undefined}
                        />
                    </aside>
                </Popover>
            )}
        </aside>
    )
}

const ItemTitle: React.FunctionComponent<{
    title: Item['title']
}> = ({ title }) => <h4 className={styles.title}>{title}</h4>

const ItemDetail: React.FunctionComponent<Pick<Item, 'title' | 'detail' | 'image'> & { iframe?: string }> = ({
    title,
    detail,
    image,
    iframe,
}) => {
    // Wait for the iframe to load before displaying it, to reduce visual flicker.
    const [iframeLoaded, setIframeLoaded] = useState(false)
    const onIframeLoad = useCallback<React.ReactEventHandler<HTMLIFrameElement>>(ev => {
        // Calling setTimeout reduces the visual flicker.
        setTimeout(() => setIframeLoaded(true))
    }, [])
    return (
        <>
            {detail && <p className={styles.detail}>{detail}</p>}
            {image && <ItemImage image={image} />}
            {iframe && !image && (
                <div className={styles.iframeContainer}>
                    <iframe
                        title={title}
                        className={classNames(styles.iframe, iframeLoaded ? styles.iframeLoaded : null)}
                        src={iframe}
                        frameBorder={0}
                        scrolling="no"
                        tabIndex={-1}
                        sandbox="allow-scripts allow-same-origin"
                        onLoad={onIframeLoad}
                    />
                </div>
            )}
        </>
    )
}

const ItemImage: React.FunctionComponent<{
    image: NonNullable<Item['image']>
}> = ({ image }) => (
    <div className={styles.imageContainer}>
        <img src={image.url} alt={image.alt} width={image.width} height={image.height} className={styles.image} />
    </div>
)

/**
 * A list of OCG items.
 */
export const ItemChipList: React.FunctionComponent<{
    items: Item[]
    className?: string
    chipClassName?: string
    popoverClassName?: string
}> = ({ items, className, chipClassName, popoverClassName }) => (
    <div className={classNames(styles.list, className)}>
        {items.map(item => (
            <ItemChip key={item.id} item={item} className={chipClassName} popoverClassName={popoverClassName} />
        ))}
    </div>
)
