import type { Annotation } from '@openctx/schema'
import { renderHoverToHTML } from '@openctx/ui-common'
import type { FunctionComponent } from 'react'
import { BaseChip } from './BaseChip'

/**
 * A single OpenCtx annotation, displayed as a "chip".
 */
export const Chip: FunctionComponent<{
    annotation: Annotation
    className?: string
    popoverClassName?: string
}> = ({ annotation: { item }, className, popoverClassName }) => {
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
