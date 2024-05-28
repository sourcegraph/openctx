import type { Provider } from '@openctx/provider'

const provider: Provider = {
    meta: () => ({
        features: { annotations: { implements: true, selectors: [{ path: 'foo' }] } },
        name: 'foo',
    }),
    annotations: () => [],
}

export default provider
