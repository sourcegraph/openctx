import type { EachWithProviderUri, MentionsResult } from '@openctx/client'
import { useObservableState } from 'observable-hooks'
import { type FunctionComponent, type ReactNode, useMemo, useState } from 'react'
import { catchError, of } from 'rxjs'
import { EditorHeader } from './EditorHeader.js'
import styles from './MentionConsole.module.css'
import { useOpenCtxClient } from './useOpenCtxClient.js'

export const MentionConsole: FunctionComponent<{
    settings: string
    simple?: boolean
    className?: string
    contentClassName?: string
    headerChildren?: ReactNode
    headerClassName?: string
    headerTitleClassName?: string
    headerValidClassName?: string
    headerInvalidClassName?: string
}> = ({
    settings,
    simple,
    className,
    contentClassName,
    headerChildren,
    headerClassName,
    headerTitleClassName,
    headerValidClassName,
    headerInvalidClassName,
}) => {
    const client = useOpenCtxClient(settings)

    const [query, setQuery] = useState('')
    const mentionsOrError = useObservableState(
        useMemo(
            () =>
                client.mentionsChanges({ query }).pipe(
                    catchError(error =>
                        of({
                            error: error instanceof Error ? error : new Error(String(error)),
                        }),
                    ),
                ),
            [client, query],
        ),
        undefined,
    )

    return (
        <section className={className}>
            {!simple && (
                <EditorHeader
                    title="Mentions"
                    className={headerClassName}
                    titleClassName={headerTitleClassName}
                    validClassName={headerValidClassName}
                    invalidClassName={headerInvalidClassName}
                >
                    {headerChildren}
                </EditorHeader>
            )}
            <div className={contentClassName}>
                <form className={styles.queryForm}>
                    <label htmlFor="query">Query</label>
                    <input
                        id="query"
                        type="text"
                        value={query}
                        onChange={e => setQuery(e.target.value)}
                        placeholder="Mention..."
                        // biome-ignore lint/a11y/noAutofocus: <explanation>
                        autoFocus={true}
                        className={styles.queryInput}
                    />
                </form>
                {mentionsOrError ? (
                    'error' in mentionsOrError ? (
                        <span>Error: {String(mentionsOrError.error)}</span>
                    ) : (
                        <ol className={styles.mentionsList}>
                            {mentionsOrError.map(mention => (
                                <MentionItem
                                    key={`${mention.uri}:${mention.title}`}
                                    as="li"
                                    mention={mention}
                                />
                            ))}
                        </ol>
                    )
                ) : null}
            </div>
        </section>
    )
}

const MentionItem: FunctionComponent<{
    as: 'li'
    mention: EachWithProviderUri<MentionsResult>[number]
}> = ({ as: Tag = 'li', mention }) => {
    return (
        <Tag className={styles.mentionItem}>
            <AnchorOrSpan href={mention.uri.startsWith('https://') ? mention.uri : undefined}>
                {mention.title}
            </AnchorOrSpan>
            <details className={styles.mentionDetails}>
                <summary>Data</summary>
                <pre>
                    <code>{JSON.stringify(mention, null, 2)}</code>
                </pre>
            </details>
        </Tag>
    )
}

const AnchorOrSpan: FunctionComponent<{ href: string | undefined; children: ReactNode }> = ({
    href,
    children,
}) => (href ? <a href={href}>{children}</a> : <span>{children}</span>)
