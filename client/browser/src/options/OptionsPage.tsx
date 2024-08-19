import clsx from 'clsx'
import type { Observable } from 'observable-fns'
import {
    type ChangeEventHandler,
    type FormEventHandler,
    type FunctionComponent,
    useCallback,
    useEffect,
    useRef,
    useState,
} from 'react'
import { storage } from '../browser-extension/web-extension-api/storage.js'
import { configurationStringChanges } from '../configuration.js'
import styles from './OptionsPage.module.css'

export const OptionsPage: FunctionComponent = () => {
    const configuration = useObservableState(configurationStringChanges)

    const [pendingConfig, setPendingConfig] = useState<string | undefined>(configuration)

    const isLoading = configuration === undefined
    const [isSaving, setIsSaving] = useState(false)

    const TEXTAREA_ID = 'config-editor'
    const textareaRef = useRef<HTMLTextAreaElement>(null)

    const onChange = useCallback<ChangeEventHandler<HTMLTextAreaElement>>(event => {
        setPendingConfig(event.currentTarget.value)
    }, [])
    const onSubmit = useCallback<FormEventHandler>(
        event => {
            event.preventDefault()
            setIsSaving(true)
            if (pendingConfig !== undefined) {
                storage.sync
                    .set({ configuration: { jsonc: pendingConfig ?? configuration } })
                    .catch(error => {
                        console.error(error)
                        alert('Failed to save OpenCtx configuration.')
                    })
                    .finally(() => {
                        setIsSaving(false)
                        textareaRef.current?.focus()
                    })
            }
        },
        [configuration, pendingConfig],
    )

    const isDirty = pendingConfig !== undefined && pendingConfig !== configuration
    const formDisabled = isLoading || isSaving

    const onKeyDown = useCallback<React.KeyboardEventHandler>(
        event => {
            // Ctrl+S saves the configuration.
            if (
                !formDisabled &&
                isDirty &&
                event.key === 's' &&
                (event.ctrlKey || event.metaKey) &&
                !(event.ctrlKey && event.metaKey) &&
                !event.altKey &&
                !event.shiftKey
            ) {
                event.preventDefault()
                onSubmit(event)
            }
        },
        [formDisabled, isDirty, onSubmit],
    )

    return (
        <form className={styles.container} onSubmit={onSubmit}>
            <h1 className={styles.heading}>
                <label className={styles.title} htmlFor={TEXTAREA_ID}>
                    Configuration for OpenCtx
                </label>
                <a
                    href="https://openctx.org/docs"
                    target="_blank"
                    rel="noreferrer"
                    className={styles.docsLink}
                >
                    Docs
                </a>
            </h1>
            <textarea
                ref={textareaRef}
                id={TEXTAREA_ID}
                // biome-ignore lint/a11y/noAutofocus: ...
                autoFocus={true}
                className={clsx(styles.editor, formDisabled && styles.editorDisabled)}
                readOnly={isLoading}
                value={pendingConfig ?? configuration}
                onChange={onChange}
                onKeyDown={onKeyDown}
            />
            <button
                type="submit"
                disabled={formDisabled || !isDirty}
                className={styles.submit}
                title={isDirty ? '' : 'No changes to save'}
            >
                {isSaving ? 'Saving...' : 'Save'}
            </button>
        </form>
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
