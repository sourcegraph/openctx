import { readFile } from 'node:fs/promises'
import { type Provider, fetchProviderSource } from '@openctx/client'
import * as vscode from 'vscode'
import { esmToCommonJS } from './esmToCommonJS.js'

export async function importProvider(providerUri: string): Promise<{ default: Provider }> {
    const url = new URL(providerUri)

    let source: string
    if (url.protocol === 'file:') {
        source = await readFile(url.pathname, 'utf-8')
    } else {
        source = await fetchProviderSource(providerUri)
    }

    if (vscode.env.uiKind === vscode.UIKind.Desktop) {
        // VS Code Desktop only supports require()ing of CommonJS modules.
        return importCommonJSFromESM(source, providerUri) as { default: Provider }
    }

    // VS Code Web supports import()ing, but not cross-origin.
    return (await importESMFromString(source)) as { default: Provider }
}

/**
 * Convert an ESM bundle to CommonJS.
 *
 * VS Code does not support dynamically import()ing ES modules (see
 * https://github.com/microsoft/vscode/issues/130367). But we always want OpenCtx providers to be ES
 * modules for consistency. So, we need to rewrite the ESM bundle to CommonJS to import it here.
 *
 * Note that it's deceiving because VS Code using extensionDevelopmentPath *does* support dynamic
 * import()s, but they fail when installing the extension from a `.vsix` (including from the
 * extension marketplace). When VS Code supports dynamic import()s for extensions, we can remove
 * this.
 */
function importCommonJSFromESM(esmSource: string, fakeFilename: string): unknown {
    return {
        default: requireCommonJSFromString(`cjs-string:${fakeFilename}`, esmToCommonJS(esmSource)),
    }
}

export function requireCommonJSFromString(filename: string, cjsSource: string): unknown {
    const Module: any = module.constructor
    const m = new Module()
    m._compile(cjsSource, filename)
    return m.exports
}

/**
 * VS Code Web requires this because it blocks import()s of remote URLs, so we need to fetch() the
 * source first and then import it by string.
 */
export function importESMFromString(esmSource: string): Promise<unknown> {
    const url = `data:text/javascript;charset=utf-8;base64,${base64Encode(esmSource)}`
    return import(/* @vite-ignore */ url)
}

/**
 * See https://developer.mozilla.org/en-US/docs/Glossary/Base64#the_unicode_problem for why we need
 * something other than just `btoa` for base64 encoding.
 */
function base64Encode(text: string): string {
    const bytes = new TextEncoder().encode(text)
    const binString = String.fromCodePoint(...bytes)
    return btoa(binString)
}
