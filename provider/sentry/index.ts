
import {
    type AnnotationsParams,
    type AnnotationsResult,
    type CapabilitiesParams,
    type CapabilitiesResult,
    type Provider
} from '@opencodegraph/provider'

import filetype from './extensions'

export interface Settings { dsn: string }

function configure(settings: Settings): any {
    // TODO
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
