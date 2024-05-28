/** @type {import('@openctx/provider').OpenCtxProvider} */
module.exports = {
    meta: () => ({
        features: { annotations: { implements: true, selectors: [{ path: 'foo' }] } },
        name: 'foo',
    }),
}
