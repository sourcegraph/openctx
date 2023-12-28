/** @type {import('@opencodegraph/provider').Provider} */
export default {
  capabilities() {
    return {}
  },
  annotations() {
    throw new Error('annotationsThrow')
  },
}
