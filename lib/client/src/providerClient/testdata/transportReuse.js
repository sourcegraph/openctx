global.__test__transportReuseInfo.moduleLoads++

/** @type {import('@opencodegraph/provider').OpenCodeGraphProvider} */
export default {
  capabilities() {
    global.__test__transportReuseInfo.capabilitiesCalls++
    return {}
  },
  annotations() {
    global.__test__transportReuseInfo.annotationsCalls++
    return { items: [], annotations: [] }
  },
}
