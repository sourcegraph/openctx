/** @type {import('@openctx/provider').OpenCtxProvider} */
module.exports = {
    meta: () => ({
        annotations: { selectors: [{ path: 'foo' }] },
        name: 'foo',
    }),
}
