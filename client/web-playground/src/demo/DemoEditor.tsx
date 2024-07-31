import { type ComponentProps, type FunctionComponent, useEffect, useState } from 'react'
import { AnnotatedEditor } from '../AnnotatedEditor.js'
import styles from './DemoApp.module.css'

const SAMPLE_FILES = [
    'github.com/sourcegraph/sourcegraph@1f857814717cf5afdb128eb005df93df5b81cc2a/client/web/src/auth/SignInPage.story.tsx',
    'github.com/sourcegraph/sourcegraph@1f857814717cf5afdb128eb005df93df5b81cc2a/client/web/src/auth/SignInPage.tsx',
    'github.com/sourcegraph/sourcegraph@1f857814717cf5afdb128eb005df93df5b81cc2a/internal/repos/github.go',
    'github.com/sourcegraph/sourcegraph@1f857814717cf5afdb128eb005df93df5b81cc2a/internal/licensing/telemetryexport.go',
    'github.com/sourcegraph/sourcegraph@1f857814717cf5afdb128eb005df93df5b81cc2a/client/BUILD.bazel',
]

export const DemoEditor: FunctionComponent<
    Omit<ComponentProps<typeof AnnotatedEditor>, 'resourceUri' | 'value' | 'onChange' | 'headerChildren'>
> = ({ ...props }) => {
    const [fileId, setFileId] = useState(
        new URLSearchParams(window.location.search).get('file') ?? DEFAULT_FILE_ID,
    )
    const [fileContent, setFileContent] = useState<string>()
    useEffect(() => {
        setFileContent(undefined)
        fetchFileContent(fileId)
            .then(setFileContent)
            .catch(error => setFileContent(`Failed to fetch file content: ${error}`))
    }, [fileId])

    return fileContent ? (
        <AnnotatedEditor
            {...props}
            resourceUri={`file:///${fileId}`}
            value={fileContent}
            onChange={setFileContent}
            codeMirrorProps={{
                theme: 'dark',
                height: '100%',
                style: { height: '100%', fontSize: '90%' },
                className: styles.editor,
            }}
            headerChildren={
                <select
                    onChange={e => {
                        const fileId = e.target.value
                        history.pushState(null, '', `?view=annotations&file=${fileId}`)
                        setFileContent(undefined)
                        setFileId(fileId)
                    }}
                >
                    {SAMPLE_FILES.map(id => (
                        <option key={id} value={id}>
                            {id.slice(id.lastIndexOf('/') + 1)}
                        </option>
                    ))}
                </select>
            }
        />
    ) : null
}

const DEFAULT_FILE_ID =
    'github.com/sourcegraph/sourcegraph@1f857814717cf5afdb128eb005df93df5b81cc2a/client/web/src/auth/SignInPage.tsx'

async function fetchFileContent(fileId: string): Promise<string> {
    const localStorageKey = `fileContent:${fileId}`

    const item = localStorage.getItem(localStorageKey)
    if (item !== null) {
        return item
    }

    const fileUrl = `https://cdn.jsdelivr.net/gh/${fileId.replace(/^github\.com\//, '')}`
    const resp = await fetch(fileUrl)
    const content = await resp.text()
    localStorage.setItem(localStorageKey, content)
    return content
}
