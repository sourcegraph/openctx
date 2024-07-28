import {
    type ChatContextClient,
    ChatContextClientProvider,
    ClientStateContextProvider,
    PromptEditor,
    PromptEditorConfigProvider,
    type PromptEditorRefAPI,
    type SerializedPromptEditorValue,
    setDisplayPathEnvInfo,
} from '@sourcegraph/prompt-editor'
import {
    type FunctionComponent,
    type ReactNode,
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
} from 'react'
import { URI } from 'vscode-uri'
import { EditorHeader } from './EditorHeader.js'
import styles from './MentionsConsole.module.css'
import { PROMPT_EDITOR_CONFIG } from './promptEditorConfig.js'
import { useOpenCtxClient } from './useOpenCtxClient.js'

export const MentionsConsole: FunctionComponent<{
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

    useEffect(() => {
        setDisplayPathEnvInfo({ workspaceFolders: [], isWindows: false })
    }, [])

    const chatContextClient = useMemo<ChatContextClient>(
        () => ({
            getChatContextItems: async params => {
                const mentions = await client.mentions(
                    { query: params.query.text },
                    { providerUri: params.query.provider ?? undefined },
                )
                return {
                    userContextFiles: mentions.map(m => ({
                        type: 'openctx',
                        provider: 'openctx',
                        providerUri: m.providerUri,
                        uri: URI.parse(m.uri),
                        title: m.title,
                        description: m.description,
                    })),
                }
            },
            getMentionProvidersMetadata: async () => {
                const providers = await client.meta({}, {})
                return {
                    providers: providers
                        .filter(provider => provider.mentions)
                        .map(({ name, providerUri, mentions }) => ({
                            title: name,
                            id: providerUri,
                            queryLabel: mentions?.label ?? 'Search...',
                            emptyLabel: 'No results',
                        })),
                }
            },
        }),
        [client],
    )

    // Autofocus editor.
    const editorRef = useRef<PromptEditorRefAPI>(null)
    useEffect(() => {
        editorRef.current?.setFocus(true)
    }, [])

    const EDITOR_VALUE_LOCALSTORAGE_KEY = 'openctx-editor-value'
    const [editorValue, setEditorValue] = useState<SerializedPromptEditorValue>()
    const onEditorStateChange = useCallback((value: SerializedPromptEditorValue) => {
        setEditorValue(value)
        localStorage.setItem(EDITOR_VALUE_LOCALSTORAGE_KEY, JSON.stringify(value))
    }, [])
    const initialEditorState = useMemo(() => {
        const valueStr = localStorage.getItem(EDITOR_VALUE_LOCALSTORAGE_KEY)
        if (valueStr === null) {
            return undefined
        }
        const value = JSON.parse(valueStr) as SerializedPromptEditorValue
        return value.editorState
    }, [])

    const onAddMentionClick = useCallback(() => {
        const text = editorValue?.text ?? ''
        if (!text.trim().endsWith('@')) {
            editorRef.current?.appendText(' @')
        }
        editorRef.current?.setFocus(true)
    }, [editorValue])

    const onClearClick = useCallback(() => {
        editorRef.current?.setEditorState({
            v: 'lexical-v1',
            lexicalEditorState: {
                root: {
                    children: [{ type: 'paragraph', version: 0 }],
                    direction: null,
                    indent: 0,
                    type: 'root',
                    version: 0,
                    format: 'left',
                },
            },
        })
        editorRef.current?.setFocus(true)
    }, [])

    return (
        <section className={`${styles.container ?? ''} ${className ?? ''}`}>
            {!simple && (
                <EditorHeader
                    title="Mentions"
                    className={headerClassName}
                    titleClassName={headerTitleClassName}
                    validClassName={headerValidClassName}
                    invalidClassName={headerInvalidClassName}
                >
                    {headerChildren}
                    <button type="button" onClick={onAddMentionClick}>
                        Add @-mention
                    </button>
                    <button type="reset" onClick={onClearClick}>
                        Clear
                    </button>
                </EditorHeader>
            )}
            <div className={`${styles.content} ${contentClassName ?? ''}`}>
                <PromptEditorConfigProvider value={PROMPT_EDITOR_CONFIG}>
                    <ClientStateContextProvider value={EMPTY_CLIENT_STATE}>
                        <ChatContextClientProvider value={chatContextClient}>
                            <PromptEditor
                                placeholder="Type @ to search for mentions"
                                initialEditorState={initialEditorState}
                                onChange={onEditorStateChange}
                                seamless={false}
                                editorClassName={styles.promptEditor}
                                editorRef={editorRef}
                            />
                        </ChatContextClientProvider>
                    </ClientStateContextProvider>
                </PromptEditorConfigProvider>
                <br />
                <details className={styles.details}>
                    <summary>Show editor state (debug)</summary>
                    <pre className={styles.debug}>
                        <code>{JSON.stringify(editorValue, null, 2)}</code>
                    </pre>
                </details>
            </div>
        </section>
    )
}

const EMPTY_CLIENT_STATE = { initialContext: [] }
