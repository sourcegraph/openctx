import type { Item } from '@openctx/schema'
import { renderHoverToHTML } from '@openctx/ui-common'
import type { FunctionComponent } from 'react'
import { BaseChip } from './BaseChip'

/**
 * A single OpenCtx item, displayed as a "chip".
 */
export const Chip: FunctionComponent<{
    item: Item
    className?: string
    popoverClassName?: string
}> = ({ item, className, popoverClassName }) => {
    const renderedHover = renderHoverToHTML(item.ui?.hover)
    return (
        <BaseChip
            title={item.title}
            url={item.url}
            className={className}
            popover={
                renderedHover ? (
                    renderedHover.format === 'text' ? (
                        <div>{renderedHover.value}</div>
                    ) : (
                        // biome-ignore lint/security/noDangerouslySetInnerHtml: input is sanitized by renderHoverToHTML
                        <div dangerouslySetInnerHTML={{ __html: renderedHover.value }} />
                    )
                ) : null
            }
            popoverClassName={popoverClassName}
        />
    )
}
