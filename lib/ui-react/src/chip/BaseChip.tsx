import clsx from 'clsx'
import { type FunctionComponent, type ReactElement, useCallback, useRef, useState } from 'react'
import styles from './BaseChip.module.css'
import { Popover } from './Popover.js'

export const BaseChip: FunctionComponent<{
    title: string
    url?: string
    className?: string
    popover?: ReactElement | null
    popoverClassName?: string
}> = ({ title, url, className, popover, popoverClassName }) => {
    const [popoverVisible, setPopoverVisible] = useState(0)
    const showPopover = useCallback((): void => {
        setPopoverVisible(prev => prev + 1)
    }, [])
    const hidePopover = useCallback((): void => {
        // Delay hiding in case the user is immediately mouseentering the popover.
        setTimeout(() => setPopoverVisible(prev => prev - 1), 100)
    }, [])

    const anchorRef = useRef<HTMLElement>(null)

    return (
        <aside className={clsx(styles.chip, className)} ref={anchorRef}>
            <header
                onMouseEnter={showPopover}
                onMouseLeave={hidePopover}
                onFocus={showPopover}
                onBlur={hidePopover}
                className={styles.header}
            >
                <h4 className={styles.title}>{title}</h4>
                {/* biome-ignore lint/a11y/useAnchorContent: Containing element has content. */}
                {url && <a className={styles.stretchedLink} href={url} />}
            </header>
            {popover && anchorRef.current && (
                <Popover
                    anchor={anchorRef.current}
                    visible={popoverVisible !== 0}
                    onMouseEnter={showPopover}
                    onMouseLeave={hidePopover}
                >
                    <aside className={clsx(styles.popoverContent, popoverClassName)}>{popover}</aside>
                </Popover>
            )}
        </aside>
    )
}
