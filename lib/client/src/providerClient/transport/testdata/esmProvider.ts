import { OpenCodeGraphProvider } from '@opencodegraph/provider'

const provider: OpenCodeGraphProvider = {
    capabilities: () => ({ selector: [{ path: 'foo' }] }),
    annotations: () => ({ items: [], annotations: [] }),
}

export default provider
