import type {
    Annotation,
    AnnotationsParams,
    AnnotationsResult,
    ItemsParams,
    ItemsResult,
    MentionsParams,
    MentionsResult,
    MetaParams,
    MetaResult,
    Provider,
    ProviderSettings,
} from '@openctx/provider'

/**
 * A demo [OpenCtx](https://openctx.org) provider that annotates every 10th line in every
 * file with "✨ Hello, world!" and returns a dummy mention.
 */
const helloWorld: Provider = {
    meta(params: MetaParams, settings: ProviderSettings): MetaResult {
        return {
            name: '✨ Hello World!',
            annotations: {},
            items: {
                messageSelectors: [{ pattern: '.*' }],
            },
        }
    },

    mentions(params: MentionsParams, settings: ProviderSettings): MentionsResult {
        return [
            {
                title: '✨ Hello, world!',
                uri: 'https://openctx.org',
                description: 'From OpenCtx',
            },
        ]
    },

    items(params: ItemsParams, settings: ProviderSettings): ItemsResult {
        return [
            {
                title: '✨ Hello, world!',
                url: 'https://openctx.org',
                ui: {
                    hover: { text: 'From OpenCtx' },
                },
                ai: {
                    content: 'Hello, world!',
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
