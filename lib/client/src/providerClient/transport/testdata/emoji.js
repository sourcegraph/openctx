/** @type {import('@opencodegraph/provider').OpenCodeGraphProvider} */
export default {
  capabilities: () => ({ selector: [{ path: 'foo' }] }),
}
// ✨
