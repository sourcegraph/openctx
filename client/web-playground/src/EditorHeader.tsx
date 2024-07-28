import type { FunctionComponent, ReactNode } from 'react'
import styles from './EditorHeader.module.css'

export const EditorHeader: FunctionComponent<{
    title: string
    status?: string
    error?: boolean
    children?: ReactNode
    className?: string
    titleClassName?: string
    validClassName?: string
    invalidClassName?: string
}> = ({
    title,
    status,
    error,
    children,
    className,
    titleClassName,
    validClassName,
    invalidClassName,
}) => (
    <header className={`${styles.header} ${className ?? ''}`}>
        <h1 className={titleClassName}>{title}</h1>
        {error ? (
            <span className={`${styles.status} ${styles.statusError} ${invalidClassName ?? ''}`}>
                Error: {status}
            </span>
        ) : status ? (
            <span className={`${styles.status} ${styles.statusOk} ${validClassName ?? ''}`}>
                {status}
            </span>
        ) : null}
        {children}
    </header>
)
