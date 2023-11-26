import {
    type AnnotationsParams,
    type AnnotationsResult,
    type CapabilitiesParams,
    type CapabilitiesResult,
    type OpenCodeGraphAnnotation,
    type OpenCodeGraphItem,
    type OpenCodeGraphProvider,
    type ProviderSettings,
} from '@opencodegraph/provider'

/**
 * A demo [OpenCodeGraph](https://opencodegraph.org) provider that annotates every 10th line in every
 * file with "✨ Hello, world!".
 */
const helloWorld: OpenCodeGraphProvider = {
    capabilities(params: CapabilitiesParams, settings: ProviderSettings): CapabilitiesResult {
        return {}
    },

    annotations(params: AnnotationsParams, settings: ProviderSettings): AnnotationsResult {
        const item: OpenCodeGraphItem = {
            id: 'hello-world',
            title: '✨ Hello, world!',
            detail: 'From OpenCodeGraph',
            url: 'https://opencodegraph.org',
        }

        const lines = params.content.split('\n')
        const annotations: OpenCodeGraphAnnotation[] = []
        for (const [i, line] of lines.entries()) {
            if (i % 10 !== 0) {
                continue
            }
            annotations.push({
                range: {
                    start: { line: i, character: 0 },
                    end: { line: i, character: line.length },
                },
                item: { id: item.id },
            })
        }

        return { items: [item], annotations }
    },
}

export default helloWorld
