/** @type {import('@opencodegraph/provider').OpenCodeGraphProvider} */
export default {
  capabilities() {
    throw new Error('capabilitiesThrow')
  },
  annotations() {
    return { items: [], annotations: [] }
  },
}
