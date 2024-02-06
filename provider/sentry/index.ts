
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

const sentry: Provider<Settings> = {
    capabilities(params: CapabilitiesParams, settings: Settings): CapabilitiesResult {
        return {} // FIXME: Map platform correctly
        return { selector: extensions.filetype(settings.platform || 'null')
                                     .map(ext => new Object({path: ext})) }
    },

    async annotations(params: AnnotationsParams, settings: Settings): Promise<AnnotationsResult> {
        const client: Sentry = new Sentry(settings)
        const result: AnnotationsResult = { items: [], annotations: [] }

        // Fetch project & issues from Sentry
        const errs: any = await client.errors(settings.organization, settings.project)
        const project: any = await client.project(settings.organization, settings.project)

        errs.forEach((err: any) => {
            const stacktrace = err.entries.filter((e: any) => e.type === 'stacktrace')
            stacktrace.forEach((trace: any) => {
                trace.data.frames.forEach((frame: any) => {
                    if (frame.lineNo <= params.content.split(/\r?\n/).length) {
                        result.items.push({
                            id: frame.lineNo,
                            title: `🔺 ${err.title ?? err.message}` ?? 'Unknown Error',
                            url: `https://${project.slug}.sentry.io/issues/${err.groupID}/?project=${err.projectID}`
                        })
                        result.annotations.push({
                            item: { id: frame.lineNo },
                            range: {
                                start: { line: frame.lineNo, character: 0 },
                                end: { line: frame.lineNo, character: 1 }
                            }
                        })
                    }
                })
            })
        })

        return result
    },
}

export default sentry
