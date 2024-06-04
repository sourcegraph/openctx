import type {
    AnnotationsParams,
    AnnotationsResult,
    MetaParams,
    MetaResult,
    Provider,
    ProviderSettings,
} from '@openctx/provider'

/**
 * An [OpenCtx](https://openctx.org) provider that annotates every function declaration with
 * the CPU time and memory allocations associated with it.
 */
const pprof: Provider = {
    meta(params: MetaParams, settings: ProviderSettings): MetaResult {
        return {
            name: 'pprof',
            annotations: {
                selectors: [{ path: '**/*.go' }],
            },
        }
    },

    annotations(params: AnnotationsParams, settings: ProviderSettings): AnnotationsResult {
        return []
    },
}

export default pprof
