import type { Item } from '@openctx/schema'
import type { FunctionComponent } from 'react'
import { BaseChip } from './BaseChip'
import styles from './ChipGroup.module.css'

export const ChipGroup: FunctionComponent<{
    group: string
    items: Item[]
    className?: string
    popoverClassName?: string
}> = ({ group, items, className, popoverClassName }) => (
    <BaseChip
        title={group}
        className={className}
        popover={<ChipList items={items} />}
        popoverClassName={popoverClassName}
    />
)

const ChipList: FunctionComponent<{ items: Item[] }> = ({ items }) => (
    <ul className={styles.list}>
        {items.map((item, i) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: <explanation>
            <ChipListItem key={i} item={item} />
        ))}
    </ul>
)

const ChipListItem: FunctionComponent<{ item: Item }> = ({ item }) => (
    <li key={item.title} tabIndex={-1}>
        {item.url ? (
            <a title={item.ui?.hover?.text} href={item.url} className={styles.listItemLink}>
                {item.title}
            </a>
        ) : (
            <span title={item.ui?.hover?.text}>{item.title}</span>
        )}
    </li>
)
