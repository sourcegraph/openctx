import { javascript } from '@codemirror/lang-javascript'
import { createClient } from '@openctx/client'
import type { ConfigurationUserInput } from '@openctx/client/src/configuration'
import { useOpenCtxExtension } from '@openctx/codemirror-extension'
import CodeMirror, { type ReactCodeMirrorProps } from '@uiw/react-codemirror'
import { useObservableState } from 'observable-hooks'
import type React from 'react'
import { useMemo, useState } from 'react'
import { NEVER, catchError, of, tap } from 'rxjs'
import { EditorHeader } from './EditorHeader'
import { mergeCodeMirrorProps } from './codemirror'

let promptedForAuthInfo = false // don't prompt too many times

export const AnnotatedEditor: React.FunctionComponent<{
    resourceUri: string
    value: string
    onChange: (value: string) => void
    settings: string
    simple?: boolean
    className?: string
    codeMirrorProps?: Omit<ReactCodeMirrorProps, 'value' | 'onChange'>
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
    headerTitleClassName,
    headerValidClassName,
    headerInvalidClassName,
}) => {
    const client = useMemo(
        () =>
            createClient({
                configuration: async () =>
                    Promise.resolve({
                        enable: true,
                        providers: JSON.parse(settings)[
                            'openctx.providers'
                        ] as ConfigurationUserInput['providers'],
                    }),
                authInfo: async provider => {
                    const hostname = new URL(provider).hostname
                    if (hostname === 'sourcegraph.test') {
                        const STORAGE_KEY = 'sourcegraphTestAccessToken'
                        let token = localStorage.getItem(STORAGE_KEY)
                        if (token === null && !promptedForAuthInfo) {
                            promptedForAuthInfo = true
                            token = prompt('Enter an access token for https://sourcegraph.test:3443.')
                            if (token === null) {
                                throw new Error('No access token provided')
                            }
                            localStorage.setItem(STORAGE_KEY, token)
                        }
                        if (token !== null) {
                            return { headers: { Authorization: `token ${token}` } }
                        }
                    }
                    return null
                },
                makeRange: r => r,
                logger: console.error,
            }),
        [settings]
    )

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
                          catchError(() => of([]))
                      )
                    : NEVER,
            [client, value, resourceUri]
        ),
        []
    )

    const octxExtension = useOpenCtxExtension({
        visibility: true,
        anns,
    })
    const extensions = useMemo(
        () => [javascript({ jsx: true, typescript: true }), octxExtension],
        [octxExtension]
    )

    return (
        <section className={className}>
            {!simple && (
                <EditorHeader
                    title="Annotated code"
                    status={error ?? `${anns.length} annotations`}
                    error={Boolean(error)}
                    titleClassName={headerTitleClassName}
                    validClassName={headerValidClassName}
                    invalidClassName={headerInvalidClassName}
                />
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
                    codeMirrorProps
                )}
            />
        </section>
    )
}
