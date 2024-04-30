import type {
    Annotation,
    AnnotationsParams,
    AnnotationsResult,
    CapabilitiesParams,
    CapabilitiesResult,
    ItemsParams,
    ItemsResult,
    Provider,
    ProviderSettings,
} from '@openctx/provider'

/**
 * A demo [OpenCtx](https://openctx.org) provider that annotates every 10th line in every
 * file with "✨ Hello, world!".
 */
const helloWorld: Provider = {
    capabilities(params: CapabilitiesParams, settings: ProviderSettings): CapabilitiesResult {
        return {}
    },

    items(params: ItemsParams, settings: ProviderSettings): ItemsResult {
        return [
            {
                title: '✨ Hello, world!',
                url: 'https://openctx.org',
                ui: {
                    hover: { text: 'From OpenCtx' },
                },
            },
        ]
    },

    annotations(params: AnnotationsParams, settings: ProviderSettings): AnnotationsResult {
        const lines = params.content.split('\n')
        const anns: Annotation[] = []
        for (const [i, line] of lines.entries()) {
            if (i % 10 !== 0) {
                continue
            }
            anns.push({
                uri: params.uri,
                range: {
                    start: { line: i, character: 0 },
                    end: { line: i, character: line.length },
                },
                item: {
                    title: '✨ Hello, world!',
                    url: 'https://openctx.org',
                    ui: {
                        hover: { text: 'From OpenCtx' },
                    },
                },
            })
        }

        return anns
    },
}

export default helloWorld
