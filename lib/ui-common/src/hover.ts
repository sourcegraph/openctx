import type { Hover } from '@openctx/schema'
import { marked } from 'marked'
import { filterXSS } from 'xss'

/**
 * Render an item's UI hover to HTML. If the detail is in Markdown, the produced HTML is sanitized
 * before being returned.
 */
export function renderHoverToHTML(hover: Hover | undefined): {
    format: 'text' | 'html'
    value: string
} | null {
    if (!hover) {
        return null
    }

    if (!hover?.markdown) {
        return hover?.text ? { format: 'text', value: hover.text } : null
    }

    let unsafeHTML = marked.parse(hover.markdown, { async: false, silent: true }) as string

    // Remove surrounding <p> if it's only one line.
    if (!hover.markdown.includes('\n')) {
        unsafeHTML = unsafeHTML.replace(/^<p>(.*)<\/p>\n?$/, '$1')
    }

    return {
        format: 'html',
        value: filterXSS(unsafeHTML, { stripIgnoreTagBody: true }).trim(),
    }
}
