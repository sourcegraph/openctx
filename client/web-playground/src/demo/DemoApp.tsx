import { type FunctionComponent, useCallback, useEffect, useState } from 'react'
import { SettingsEditor } from '../SettingsEditor.js'
import styles from './DemoApp.module.css'
import { DemoEditor } from './DemoEditor.js'
import { DemoMentionConsole } from './DemoMentionConsole.js'
import { getDefaultSettings } from './settings.js'

const SETTINGS_LOCALSTORAGE_KEY = 'openctx-playground-settings'

const SETTINGS_EDITOR_ID = 'settings-editor'
const SETTINGS_EDITOR_WIDTH_LOCALSTORAGE_KEY = 'openctx-playground-settings-editor-width'

export const DemoApp: FunctionComponent = () => {
    const [settings, setSettings] = useState<string | undefined>(
        localStorage.getItem(SETTINGS_LOCALSTORAGE_KEY) ?? undefined,
    )

    useEffect(() => {
        if (settings === undefined) {
            getDefaultSettings().then(setSettings).catch(console.error)
        }
    }, [settings])
    const onSettingsChange = useCallback((settings: string) => {
        localStorage.setItem(SETTINGS_LOCALSTORAGE_KEY, settings)
        setSettings(settings)

        // Also save the width of the settings editor.
        const width = document.getElementById(SETTINGS_EDITOR_ID)?.offsetWidth
        if (width !== undefined) {
            localStorage.setItem(SETTINGS_EDITOR_WIDTH_LOCALSTORAGE_KEY, String(width))
        }
    }, [])
    const onResetSettingsClick = useCallback(() => {
        localStorage.removeItem(SETTINGS_LOCALSTORAGE_KEY)
        getDefaultSettings().then(setSettings).catch(console.error)
    }, [])
    useEffect(() => {
        const width = localStorage.getItem(SETTINGS_EDITOR_WIDTH_LOCALSTORAGE_KEY)
        const settingsEditor = document.getElementById(SETTINGS_EDITOR_ID)
        if (width !== null && settingsEditor) {
            settingsEditor.style.width = width + 'px'
        }
    }, [])

    const params = new URLSearchParams(window.location.search)

    const view: 'mentions' | 'annotations' =
        params.get('view') === 'annotations' ? 'annotations' : 'mentions'

    return settings ? (
        <div className={styles.container}>
            <header className={styles.header}>
                <h1>OpenCtx playground</h1>
                <nav>
                    <ul>
                        <li>
                            <a href="?view=mentions">Mentions</a>
                        </li>
                        <li>
                            <a href="?view=annotations">Annotations</a>
                        </li>
                    </ul>
                </nav>
            </header>
            <main className={styles.main}>
                <SettingsEditor
                    id={SETTINGS_EDITOR_ID}
                    value={settings}
                    onChange={onSettingsChange}
                    className={styles.viewContainer}
                    headerClassName={styles.viewContainerHeader}
                    codeMirrorProps={{
                        theme: 'dark',
                        height: '100%',
                        style: { height: '100%', fontSize: '90%' },
                        className: styles.editor,
                    }}
                    headerChildren={
                        <button type="reset" onClick={onResetSettingsClick}>
                            Reset to defaults
                        </button>
                    }
                />
                {view === 'mentions' ? (
                    <DemoMentionConsole
                        settings={settings}
                        className={`${styles.viewContainer}`}
                        headerClassName={styles.viewContainerHeader}
                        contentClassName={styles.viewContainerContent}
                    />
                ) : (
                    <DemoEditor
                        settings={settings}
                        className={styles.viewContainer}
                        headerClassName={styles.viewContainerHeader}
                        codeMirrorProps={{
                            theme: 'dark',
                            height: '100%',
                            style: { height: '100%', fontSize: '90%' },
                            className: styles.editor,
                        }}
                    />
                )}
            </main>
        </div>
    ) : null
}
