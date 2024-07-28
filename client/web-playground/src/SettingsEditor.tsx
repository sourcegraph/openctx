import { json, jsonParseLinter } from '@codemirror/lang-json'
import { linter } from '@codemirror/lint'
import CodeMirror, { type ReactCodeMirrorProps } from '@uiw/react-codemirror'
import type React from 'react'
import { type ReactNode, useMemo } from 'react'
import { EditorHeader } from './EditorHeader.js'
import { mergeCodeMirrorProps } from './codemirror.js'

export const SettingsEditor: React.FunctionComponent<{
    id?: string
    className?: string
    value: string
    onChange: (value: string) => void
    codeMirrorProps?: Omit<ReactCodeMirrorProps, 'value' | 'onChange'>
    headerChildren?: ReactNode
    headerClassName?: string
    headerTitleClassName?: string
    headerValidClassName?: string
    headerInvalidClassName?: string
}> = ({
    id,
    value,
    onChange,
    className,
    codeMirrorProps,
    headerChildren,
    headerClassName,
    headerTitleClassName,
    headerValidClassName,
    headerInvalidClassName,
}) => {
    const extensions = useMemo(() => [json(), linter(jsonParseLinter())], [])

    const { status, error } = useMemo(() => {
        try {
            JSON.parse(value)
            return { status: 'Valid', error: false }
        } catch {
            return { status: 'Invalid JSON', error: true }
        }
    }, [value])

    return (
        <section className={className} id={id}>
            <EditorHeader
                title="Settings"
                status={status}
                error={error}
                className={headerClassName}
                titleClassName={headerTitleClassName}
                validClassName={headerValidClassName}
                invalidClassName={headerInvalidClassName}
            >
                {headerChildren}
            </EditorHeader>
            <CodeMirror
                value={value}
                onChange={onChange}
                {...mergeCodeMirrorProps({ extensions, basicSetup: false }, codeMirrorProps)}
            />
        </section>
    )
}
