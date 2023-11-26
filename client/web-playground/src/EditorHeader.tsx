import { type FunctionComponent } from 'react'
import styles from './EditorHeader.module.css'

export const EditorHeader: FunctionComponent<{
    title: string
    status: string
    error: boolean
    titleClassName?: string
    validClassName?: string
    invalidClassName?: string
}> = ({ title, status, error, titleClassName, validClassName, invalidClassName }) => (
    <header className={styles.header}>
        <h1 className={titleClassName}>{title}</h1>
        {error ? (
            <span className={`${styles.status} ${styles.statusError} ${invalidClassName ?? ''}`}>Error: {status}</span>
        ) : (
            <span className={`${styles.status} ${styles.statusOk} ${validClassName ?? ''}`}>{status}</span>
        )}
    </header>
)
