/** @type {import('@openctx/provider').Provider} */
export default {
    meta() {
        return { features: { annotations: { implements: true } } }
    },
    items() {
        throw new Error('itemsThrow')
    },
    annotations() {
        throw new Error('annotationsThrow')
    },
}
