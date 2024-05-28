import type { Provider } from '@openctx/provider'

const provider: Provider = {
    meta: () => ({
        annotations: { selectors: [{ path: 'foo' }] },
        name: 'foo',
    }),
    annotations: () => [],
}

export default provider
