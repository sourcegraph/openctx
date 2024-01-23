
import {
    type AnnotationsParams,
    type AnnotationsResult,
    type CapabilitiesParams,
    type CapabilitiesResult,
    type Provider
} from '@opencodegraph/provider'

export interface Settings {
    /** Organization slug */
    organization: string

    /** Individual project id */
    project: string

    /** Sentry auth token */
    token: string
}

const sentry: Provider<Settings> = {
    capabilities(params: CapabilitiesParams, settings: Settings): CapabilitiesResult {
        // TODO
    },

    async annotations(params: AnnotationsParams, settings: Settings): AnnotationsResult {
        // TODO
    }
}

export default sentry
