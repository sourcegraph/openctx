
// TODO: Remove this and fix subsequent warnings
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */

import {
    type AnnotationsParams,
    type AnnotationsResult,
    type CapabilitiesParams,
    type CapabilitiesResult,
    type Provider
} from '@opencodegraph/provider'

import { Sentry } from './web/client'
import * as extensions from './extensions'


export interface Settings {
    /** Organization slug */
    organization: string

    /** Individual project slug */
    project: string

    /** Sentry auth token */
    token: string

    /** Sentry platform */
    platform?: string   // TODO: Use platform value from sentry API
}

function parseStacktrace(frames: any, params: AnnotationsParams, metadata: any): void {
    frames.forEach((frame: any) => {
        if (frame.lineNo <= params.content.split(/\r?\n/).length) {
            metadata.result.items.push({
                id: frame.lineNo,
                title: `🔺 ${metadata.err.title ?? metadata.err.message}` ?? 'Unknown Error',
                url: `https://${metadata.project.organization.slug}.sentry.io/issues/${metadata.err.groupID}/?project=${metadata.err.projectID}`
            })
            metadata.result.annotations.push({
                item: { id: frame.lineNo },
                range: {
                    start: { line: frame.lineNo, character: 0 },
                    end: { line: frame.lineNo, character: 1 }
                }
            })
        }
    })
}

const sentry: Provider<Settings> = {
    capabilities(params: CapabilitiesParams, settings: Settings): CapabilitiesResult {
        return {} // FIXME: Map platform correctly
        return { selector: extensions.filetype(settings.platform || 'null')
                                     .map(ext => new Object({path: ext})) }
    },

    async annotations(params: AnnotationsParams, settings: Settings): Promise<AnnotationsResult> {
        const client: Sentry = new Sentry(settings)
        const metadata = {
            err: null,
            result: { items: [], annotations: [] },
            project: await client.project(settings.organization, settings.project),
        }

        // Fetch project & issues from Sentry
        const errs: any = await client.errors(settings.organization, settings.project)
        errs?.forEach((err: any) => {
            // Update metadata
            metadata.err = err

            // Parse through stacktrace if available
            const stacktrace = err.entries.filter((e: any) => e.type === 'stacktrace')
            stacktrace?.forEach((val: any) => parseStacktrace(val.data.frames, params, metadata))

            // Parse through exception if available
            const exception = err.entries.filter((e: any) => e.type === 'exception')
            exception?.forEach((exc: any) => {
                exc.data.values.forEach((val: any) => parseStacktrace(val.stacktrace.frames, params, metadata))
            })

            // TODO: Can we have an API response with both 'stacktrace' and 'exception' keys?
            //       How should we handle that scenario?
        })

        return metadata.result
    },
}

export default sentry
