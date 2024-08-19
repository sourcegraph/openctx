import { javascript } from '@codemirror/lang-javascript'
import type { Annotation, Range } from '@openctx/client'
import { NEVER, catchError, tap } from '@openctx/client/observable'
import { useOpenCtxExtension } from '@openctx/codemirror-extension'
import CodeMirror, { type ReactCodeMirrorProps } from '@uiw/react-codemirror'
import { Observable } from 'observable-fns'
import type React from 'react'
import { type ReactNode, useEffect, useMemo, useState } from 'react'
import { EditorHeader } from './EditorHeader.js'
import { mergeCodeMirrorProps } from './codemirror.js'
import { useOpenCtxClient } from './useOpenCtxClient.js'

export const AnnotatedEditor: React.FunctionComponent<{
    resourceUri: string
    value: string
    onChange: (value: string) => void
    settings: string
    simple?: boolean
    className?: string
    codeMirrorProps?: Omit<ReactCodeMirrorProps, 'value' | 'onChange'>
    headerChildren?: ReactNode
    headerClassName?: string
    headerTitleClassName?: string
    headerValidClassName?: string
    headerInvalidClassName?: string
}> = ({
    resourceUri,
    value,
    onChange,
    settings,
    simple,
    className,
    codeMirrorProps,
    headerChildren,
    headerClassName,
    headerTitleClassName,
    headerValidClassName,
    headerInvalidClassName,
}) => {
    const client = useOpenCtxClient(settings)

    const [error, setError] = useState<string>()

    const anns = useObservableState<Annotation<Range>[]>(
        useMemo(
            () =>
                value
                    ? client.annotationsChanges({ uri: resourceUri, content: value }).pipe(
                          tap({
                              next: () => setError(undefined),
                              error: error => setError(error.message ?? `${error}`),
                          }),
                          catchError(() => Observable.of([])),
                      )
                    : NEVER,
            [client, value, resourceUri],
        ),
        [],
    )

    const octxExtension = useOpenCtxExtension({
        visibility: true,
        anns,
    })
    const extensions = useMemo(
        () => [javascript({ jsx: true, typescript: true }), octxExtension],
        [octxExtension],
    )

    return (
        <section className={className}>
            {!simple && (
                <EditorHeader
                    title="Annotated code"
                    status={error ?? `${anns.length} annotations`}
                    error={Boolean(error)}
                    className={headerClassName}
                    titleClassName={headerTitleClassName}
                    validClassName={headerValidClassName}
                    invalidClassName={headerInvalidClassName}
                >
                    {headerChildren}
                </EditorHeader>
            )}
            <CodeMirror
                value={value}
                onChange={onChange}
                {...mergeCodeMirrorProps(
                    {
                        extensions,
                        basicSetup: {
                            lineNumbers: true,
                            foldGutter: false,
                            autocompletion: false,
                            searchKeymap: false,
                        },
                    },
                    codeMirrorProps,
                )}
            />
        </section>
    )
}

function useObservableState<T>(observable: Observable<T>): T | undefined
function useObservableState<T>(observable: Observable<T>, initialState: T): T
function useObservableState<T>(observable: Observable<T>, initialState?: T): T | undefined {
    const [state, setState] = useState<T | undefined>(initialState)
    useEffect(() => {
        let isActive = true
        const subscription = observable.subscribe({
            next: value => {
                if (isActive) {
                    setState(value)
                }
            },
            error: error => {
                if (isActive) {
                    console.error('Error in observable:', error)
                }
            },
        })

        return () => {
            isActive = false
            subscription.unsubscribe()
        }
    }, [observable])
    return state
}
