/* eslint-disable no-multiple-empty-lines */

import {
    type AnnotationsParams,
    type AnnotationsResult,
    type CapabilitiesParams,
    type CapabilitiesResult,
    type Provider
} from '@opencodegraph/provider'
import * as extensions from './extensions'


export interface Settings {
    /** Organization slug */
    organization: string

    /** Individual project id */
    project: string

    /** Sentry auth token */
    token: string

    /** Sentry platform */
    platform?: string   // TODO: Use platform value from sentry API
}

const sentry: Provider<Settings> = {
    capabilities(params: CapabilitiesParams, settings: Settings): CapabilitiesResult {
        return { selector: extensions.filetype(settings.platform) }
    },

    async annotations(params: AnnotationsParams, settings: Settings): AnnotationsResult {
        // TODO
    }
}

export default sentry
