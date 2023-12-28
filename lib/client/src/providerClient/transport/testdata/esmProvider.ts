import { Provider } from '@opencodegraph/provider'

const provider: Provider = {
    capabilities: () => ({ selector: [{ path: 'foo' }] }),
    annotations: () => ({ items: [], annotations: [] }),
}

export default provider
