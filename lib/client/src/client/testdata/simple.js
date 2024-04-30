/** @type {import('@openctx/provider').Provider} */
export default {
    capabilities: () => ({}),
    items: () => [
        {
            title: 'A',
        },
    ],
    annotations: params => [
        {
            uri: params.uri,
            range: { start: { line: 1, character: 2 }, end: { line: 3, character: 4 } },
            item: { title: 'A' },
        },
    ],
}
