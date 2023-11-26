/** @type {import('@opencodegraph/provider').OpenCodeGraphProvider} */
module.exports = {
    capabilities: () => ({ selector: [{ path: 'foo' }] }),
}
