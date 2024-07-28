import { javascript } from '@codemirror/lang-javascript'
import { useOpenCtxExtension } from '@openctx/codemirror-extension'
import CodeMirror, { type ReactCodeMirrorProps } from '@uiw/react-codemirror'
import { useObservableState } from 'observable-hooks'
import type React from 'react'
import { type ReactNode, useMemo, useState } from 'react'
import { NEVER, catchError, of, tap } from 'rxjs'
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

    const anns = useObservableState(
        useMemo(
            () =>
                value
                    ? client.annotationsChanges({ uri: resourceUri, content: value }).pipe(
                          tap({
                              next: () => setError(undefined),
                              error: error => setError(error.message ?? `${error}`),
                          }),
                          catchError(() => of([])),
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
