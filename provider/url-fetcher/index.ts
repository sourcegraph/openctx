import type {
    AnnotationsParams,
    AnnotationsResult,
    CapabilitiesParams,
    CapabilitiesResult,
    Item,
    ItemsParams,
    ItemsResult,
    Provider,
    ProviderSettings,
} from '@openctx/provider'

interface ItemsParamsProposed extends ItemsParams {
    candidate?: Item
}

interface ProviderProposed<S extends {} = ProviderSettings> extends Provider {
    candidateItems?(params: ItemsParamsProposed, settings: S): ItemsResult | Promise<ItemsResult>
    items?(params: ItemsParamsProposed, settings: S): ItemsResult | Promise<ItemsResult>
}

const urlFetcher: ProviderProposed = {
    capabilities(params: CapabilitiesParams, settings: ProviderSettings): CapabilitiesResult {
        return {
            // empty since we don't provide any annotations.
            selector: [],
        }
    },

    async candidateItems(params: ItemsParamsProposed): Promise<ItemsResult> {
        return fetchItem(params, 1000)
    },

    async items(params: ItemsParamsProposed, settings: ProviderSettings): Promise<ItemsResult> {
        return fetchItem(params)
    },

    annotations(params: AnnotationsParams, settings: ProviderSettings): AnnotationsResult {
        return []
    },
}

async function fetchItem(params: ItemsParamsProposed, timeoutMs?: number): Promise<ItemsResult> {
    if (params.candidate?.ai?.content) {
        return [params.candidate]
    }
    const url = params.candidate?.url ?? params.query
    if (!url) {
        return []
    }
    try {
        const content = await fetchContentForURLContextItem(url.toString(), timeoutSignal(timeoutMs))

        if (content === null) {
            return []
        }
        return [
            {
                url,
                title: tryGetHTMLDocumentTitle(content) ?? url,
                ui: { hover: { text: `Fetched from ${url}` } },
                ai: { content: content },
            },
        ]
    } catch (error) {
        // Suppress errors because the user might be typing a URL that is not yet valid.
        return []
    }
}

async function fetchContentForURLContextItem(
    urlStr: string,
    signal?: AbortSignal
): Promise<string | null> {
    const url = new URL(urlStr)
    if (url.protocol !== 'http' && url.protocol !== 'https') {
        return null
    }
    if (!/(localhost|\.\w{2,})$/.test(url.hostname)) {
        return null
    }

    const resp = await fetch(urlStr, { signal })
    if (!resp.ok) {
        return null
    }
    const body = await resp.text()

    // HACK(sqs): Rudimentarily strip HTML tags, script, and other unneeded elements from body using
    // regexp. This is NOT intending to be a general-purpose HTML parser and is NOT sanitizing the
    // value for security.
    const bodyWithoutTags = body
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
        .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
        .replace(/<svg\b[^<]*(?:(?!<\/svg>)<[^<]*)*<\/svg>/gi, '')
        .replace(/<!--.*?-->/gs, '')
        .replace(/\s(?:class|style)=["'][^"']*["']/gi, '')
        .replace(/\sdata-[\w-]+(=["'][^"']*["'])?/gi, '')

    // TODO(sqs): Arbitrarily trim the response text to avoid overflowing the context window for the
    // LLM. Ideally we would make the prompt builder prioritize this context item over other context
    // because it is explicitly from the user.
    const MAX_LENGTH = 14000
    return bodyWithoutTags.length > MAX_LENGTH
        ? `${bodyWithoutTags.slice(0, MAX_LENGTH)}... (web page content was truncated)`
        : bodyWithoutTags
}

/**
 * Try to get the title of an HTML document, using incomplete regexp parsing for simplicity (because
 * this feature is experimental and we don't need robustness yet).
 */
function tryGetHTMLDocumentTitle(html: string): string | undefined {
    return html.match(/<title>(?<title>[^<]+)<\/title>/)?.groups?.title
}

function timeoutSignal(ms?: number): AbortSignal | undefined {
    if (ms === undefined) {
        return undefined
    }
    const controller = new AbortController()
    setTimeout(() => controller.abort('timeout'), ms)
    return controller.signal
}

export default urlFetcher
