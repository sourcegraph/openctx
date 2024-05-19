/** @type {import('@openctx/provider').Provider} */
export default {
    meta() {
        throw new Error('metaThrow')
    },
    items() {
        return []
    },
}
