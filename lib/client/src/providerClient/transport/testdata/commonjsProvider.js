/** @type {import('@openctx/provider').Provider} */
module.exports = {
    meta: () => ({
        features: { annotations: { implements: true, selectors: [{ path: 'foo' }] } },
        name: 'foo',
    }),
}
