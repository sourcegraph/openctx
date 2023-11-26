import { json, jsonParseLinter } from '@codemirror/lang-json'
import { linter } from '@codemirror/lint'
import CodeMirror, { type ReactCodeMirrorProps } from '@uiw/react-codemirror'
import React, { useMemo } from 'react'
import { mergeCodeMirrorProps } from './codemirror'
import { EditorHeader } from './EditorHeader'

export const SettingsEditor: React.FunctionComponent<{
    className?: string
    value: string
    onChange: (value: string) => void
    codeMirrorProps?: Omit<ReactCodeMirrorProps, 'value' | 'onChange'>
    headerTitleClassName?: string
    headerValidClassName?: string
    headerInvalidClassName?: string
}> = ({
    value,
    onChange,
    className,
    codeMirrorProps,
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
        <section className={className}>
            <EditorHeader
                title="Settings"
                status={status}
                error={error}
                titleClassName={headerTitleClassName}
                validClassName={headerValidClassName}
                invalidClassName={headerInvalidClassName}
            />
            <CodeMirror
                value={value}
                onChange={onChange}
                {...mergeCodeMirrorProps({ extensions, basicSetup: false }, codeMirrorProps)}
            />
        </section>
    )
}
