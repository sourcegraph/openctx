/** @type {import('@opencodegraph/provider').Provider} */
module.exports = {
  capabilities: () => ({ selector: [{ path: 'foo' }] }),
}
