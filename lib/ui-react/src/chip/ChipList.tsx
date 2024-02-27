import type { Annotation } from '@openctx/schema'
import clsx from 'clsx'
import type { FunctionComponent } from 'react'
import { Chip } from './Chip'
import styles from './ChipList.module.css'

/**
 * A list of OpenCtx annotations (displayed as "chips").
 */
export const ChipList: FunctionComponent<{
    annotations: Annotation[]
    className?: string
    chipClassName?: string
    popoverClassName?: string
}> = ({ annotations, className, chipClassName, popoverClassName }) => {
    return (
        <div className={clsx(styles.list, className)}>
            {annotations.map((ann, i) => (
                <Chip
                    key={`u:${ann.item.url ?? i}`}
                    annotation={ann}
                    className={chipClassName}
                    popoverClassName={popoverClassName}
                />
            ))}
        </div>
    )
}
