/** @type {import('@openctx/provider').Provider} */
export default {
    meta: () => ({
        features: { annotations: { implements: true, selectors: [{ path: 'foo' }] } },
        name: 'foo',
    }),
}
// ✨
