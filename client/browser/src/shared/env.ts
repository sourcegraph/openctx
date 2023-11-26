enum ScriptEnvironment {
    Content,
    Background,
    Options,
}

function getScriptEnvironment(): ScriptEnvironment {
    let scriptEnvironment: ScriptEnvironment = ScriptEnvironment.Content
    if (typeof window !== 'undefined' && window.location.pathname.includes('options.html')) {
        scriptEnvironment = ScriptEnvironment.Options
    } else if (
        globalThis.browser &&
        typeof self !== 'undefined' &&
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        (globalThis as any).ServiceWorkerGlobalScope !== undefined &&
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        self instanceof ServiceWorkerGlobalScope
    ) {
        scriptEnvironment = ScriptEnvironment.Background
    } else {
        scriptEnvironment = ScriptEnvironment.Content
    }

    return scriptEnvironment
}

const scriptEnvironment = getScriptEnvironment()

export const isBackground = scriptEnvironment === ScriptEnvironment.Background
export const isOptions = scriptEnvironment === ScriptEnvironment.Options
