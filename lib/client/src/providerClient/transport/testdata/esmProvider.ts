import type { Provider } from '@openctx/provider'

const provider: Provider = {
    capabilities: () => ({ selector: [{ path: 'foo' }], meta: { name: 'foo' } }),
    annotations: () => [],
}

export default provider
