global.__test__transportReuseInfo.moduleLoads++

/** @type {import('@openctx/provider').Provider} */
export default {
    meta() {
        global.__test__transportReuseInfo.metaCalls++
        return {}
    },
    items() {
        global.__test__transportReuseInfo.itemsCalls++
        return []
    },
    annotations() {
        global.__test__transportReuseInfo.annotationsCalls++
        return []
    },
}
