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
 * A demo [OpenCtx](https://openctx.org) provider that provides some sample
 * @-mentions, and annotates every 10th line in every file with "✨ Hello,
 * world!".
 */
const provider: Provider = {
    meta(params: MetaParams, settings: ProviderSettings): MetaResult {
        return { name: 'Hello World', mentions: {}, annotations: {} }
    },

    mentions(params: MentionsParams, settings: ProviderSettings): MentionsResult {
        // Initial state
        if (!params.query) {
            return [
                {
                    title: '✨ Hello World!',
                    description: 'This is a sample @-mention',
                    uri: 'https://openctx.org/',
                    data: { key: 'hello-world-1' },
                },
            ]
        }

        // Typed a query/search
        return [
            {
                title: '🎉 Foo Bar Baz',
                description: `Item matching "${params.query}"`,
                uri: 'https://openctx.org/',
                data: { key: 'hello-world-2' },
            },
        ]
    },

    items(params: ItemsParams, settings: ProviderSettings): ItemsResult {
        const mentionKey = params.mention?.data?.key as string

        return [
            {
                title: `Hello World (${mentionKey})`,
                url: 'https://openctx.org',
                ui: {
                    hover: { text: 'From OpenCtx' },
                },
                ai: {
                    content: `This is the content of this item: 'Hello world context data (${mentionKey})'`,
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

export default provider
