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
import { getSymbolContextFiles } from './symbols'

interface ItemsParamsProposed extends ItemsParams {
    candidate?: Item
}

interface ProviderProposed<S extends {} = ProviderSettings> extends Provider {
    candidateItems?(params: ItemsParamsProposed, settings: S): ItemsResult | Promise<ItemsResult>
    items?(params: ItemsParamsProposed, settings: S): ItemsResult | Promise<ItemsResult>
}

const vscodeSymbols: ProviderProposed = {
    capabilities(params: CapabilitiesParams, settings: ProviderSettings): CapabilitiesResult {
        return {
            // empty since we don't provide any annotations.
            selector: [],
        }
    },

    async candidateItems(params: ItemsParamsProposed): Promise<ItemsResult> {
        if (!params.query) {
            return []
        }
        const symbols = await getSymbolContextFiles(params.query)
        return symbols.map(s => {
            return {
                title: s.symbolName, // TODO `@${displayPath(URI.parse(contextItem.uri))}${rangeText}#${contextItem.symbolName}`
                url: s.uri,
                ai: {
                    content: s.content,
                },
            } satisfies Item
        })
    },

    async items(params: ItemsParamsProposed, settings: ProviderSettings): Promise<ItemsResult> {
        // TODO
        // (await editor.getTextEditorContentForFile(contextItem.uri, toVSCodeRange(contextItem.range)))
        return []
    },

    annotations(params: AnnotationsParams, settings: ProviderSettings): AnnotationsResult {
        return []
    },
}

export default vscodeSymbols
