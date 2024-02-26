import type { Item, Range } from '@openctx/schema'

export interface ItemWithRichRange<R extends Range> extends Omit<Item, 'range'> {
    range?: R
}

/**
 * Prepare items for presentation, which currently only entails sorting them.
 */
export function prepareItemsForPresentation(items: Item[]): Item[]
export function prepareItemsForPresentation<R extends Range = Range>(
    items: ItemWithRichRange<R>[]
): ItemWithRichRange<R>[]
export function prepareItemsForPresentation<R extends Range = Range>(
    items: ItemWithRichRange<R>[]
): ItemWithRichRange<R>[] {
    return items.sort((a, b) => (a.range?.start.line ?? 0) - (b.range?.start.line ?? 0))
}
