import type { Item } from '@openctx/schema'
import clsx from 'clsx'
import type React from 'react'
import { useCallback, useRef, useState } from 'react'
import styles from './ItemChip.module.css'
import { Popover } from './Popover'

/**
 * A single OpenCtx item, displayed as a "chip".
 */
export const ItemChip: React.FunctionComponent<{
    item: Item
    className?: string
    popoverClassName?: string
}> = ({ item, className, popoverClassName }) => {
    const hasDetail = Boolean(item.detail || item.image)

    const [popoverVisible, setPopoverVisible] = useState(false)
    const showPopover = useCallback((): void => setPopoverVisible(true), [])
    const hidePopover = useCallback((): void => setPopoverVisible(false), [])

    const anchorRef = useRef<HTMLElement>(null)

    return (
        <aside
            className={clsx(styles.item, hasDetail ? styles.itemHasDetail : null, className)}
            ref={anchorRef}
        >
            <header
                onMouseEnter={showPopover}
                onMouseLeave={hidePopover}
                onFocus={showPopover}
                onBlur={hidePopover}
            >
                <ItemTitle title={item.title} />
                {/* biome-ignore lint/a11y/useAnchorContent: Screen readers will read the content of the element over which this anchor is stretched. */}
                {item.url && <a className={styles.stretchedLink} href={item.url} />}
            </header>
            {hasDetail && anchorRef.current && (
                <Popover anchor={anchorRef.current} visible={popoverVisible}>
                    <aside className={clsx(styles.popoverContent, popoverClassName)}>
                        <ItemDetail title={item.title} detail={item.detail} image={item.image} />
                    </aside>
                </Popover>
            )}
        </aside>
    )
}

const ItemTitle: React.FunctionComponent<{
    title: Item['title']
}> = ({ title }) => <h4 className={styles.title}>{title}</h4>

const ItemDetail: React.FunctionComponent<Pick<Item, 'title' | 'detail' | 'image'>> = ({
    detail,
    image,
}) => (
    <>
        {detail && <p className={styles.detail}>{detail}</p>}
        {image && <ItemImage image={image} />}
    </>
)

const ItemImage: React.FunctionComponent<{
    image: NonNullable<Item['image']>
}> = ({ image }) => (
    <div className={styles.imageContainer}>
        <img
            src={image.url}
            alt={image.alt}
            width={image.width}
            height={image.height}
            className={styles.image}
        />
    </div>
)

/**
 * A list of OpenCtx items.
 */
export const ItemChipList: React.FunctionComponent<{
    items: Item[]
    className?: string
    chipClassName?: string
    popoverClassName?: string
}> = ({ items, className, chipClassName, popoverClassName }) => (
    <div className={clsx(styles.list, className)}>
        {items.map((item, i) => (
            <ItemChip
                key={item.url ?? i}
                item={item}
                className={chipClassName}
                popoverClassName={popoverClassName}
            />
        ))}
    </div>
)
