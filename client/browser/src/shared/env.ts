enum ScriptEnvironment {
    Content = 0,
    Background = 1,
    Options = 2,
}

function getScriptEnvironment(): ScriptEnvironment {
    let scriptEnvironment: ScriptEnvironment = ScriptEnvironment.Content
    if (typeof window !== 'undefined' && window.location.pathname.includes('options.html')) {
        scriptEnvironment = ScriptEnvironment.Options
    } else if (
        globalThis.browser &&
        typeof self !== 'undefined' &&
        (globalThis as any).ServiceWorkerGlobalScope !== undefined &&
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
