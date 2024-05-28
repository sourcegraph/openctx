/** @type {import('@openctx/provider').Provider} */
module.exports = {
    meta: () => ({
        annotations: { selectors: [{ path: 'foo' }] },
        name: 'foo',
    }),
}
