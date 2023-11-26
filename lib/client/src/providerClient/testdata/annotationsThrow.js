/** @type {import('@opencodegraph/provider').OpenCodeGraphProvider} */
export default {
  capabilities() {
    return {}
  },
  annotations() {
    throw new Error('annotationsThrow')
  },
}
