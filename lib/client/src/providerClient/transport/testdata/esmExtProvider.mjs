/** @type {import('@openctx/provider').Provider} */
export default {
    meta: () => ({
        annotations: { selectors: [{ path: 'foo' }] },
        name: 'foo',
    }),
}
