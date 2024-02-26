import type { Item } from '@openctx/schema'
import clsx from 'clsx'
import type { FunctionComponent } from 'react'
import { Chip } from './Chip'
import styles from './ChipList.module.css'

/**
 * A list of OpenCtx items (displayed as "chips").
 */
export const ChipList: FunctionComponent<{
    items: Item[]
    className?: string
    chipClassName?: string
    popoverClassName?: string
}> = ({ items, className, chipClassName, popoverClassName }) => {
    return (
        <div className={clsx(styles.list, className)}>
            {items.map((item, i) => (
                <Chip
                    key={`u:${item.url ?? i}`}
                    item={item}
                    className={chipClassName}
                    popoverClassName={popoverClassName}
                />
            ))}
        </div>
    )
}
