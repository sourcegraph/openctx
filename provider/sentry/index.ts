
// TODO: Remove this and fix subsequent warnings
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */

import type {
    AnnotationsParams,
    AnnotationsResult,
    MentionsParams,
    MentionsResult,
    MetaParams,
    MetaResult,
    Provider
} from '@openctx/provider'

import { Sentry } from './web/client.js'


export type Settings = {
    organization: string    // Organization slug
    project: string         // Individual project slug
    token: string           // Sentry auth token
    platform?: string       // Sentry platform
                            /* TODO: Use platform value from sentry API */
}

function parseStacktrace(frames: any, params: AnnotationsParams, context: any): void {
    frames.forEach((frame: any) => {
        if (frame.lineNo <= params.content.split(/\r?\n/).length) {
            context.annotations.push({
                uri: params.uri,
                item: {
                    id: frame.lineNo,
                    title: `🔺 ${context.err.title ?? context.err.message}` ?? 'Unknown Error',
                    url: `https://${context.project.organization.slug}.sentry.io/issues/${context.err.groupID}/?project=${context.err.projectID}`
                },
                range: {
                    start: { line: frame.lineNo, character: 0 },
                    end: { line: frame.lineNo, character: 1 }
                }
            })
        }
    })
}

const sentry: Provider<Settings> = {
    meta(params: MetaParams, settings: Settings): MetaResult {
        return {
            selector: [],
            name: 'Sentry',
            features: { mentions: true },
        }
    },

    async annotations(params: AnnotationsParams, settings: Settings): Promise<AnnotationsResult> {
        const client: Sentry = new Sentry(settings)
        const context = {
            err: null,
            annotations: [],
            project: await client.project(settings.organization, settings.project),
        }

        // Fetch project & issues from Sentry
        const errs: any = await client.errors(settings.organization, settings.project)
        errs?.forEach((err: any) => {
            // Update metadata
            context.err = err

            // Parse through stacktrace if available
            const stacktrace = err.entries.filter((e: any) => e.type === 'stacktrace')
            stacktrace?.forEach((val: any) => parseStacktrace(val.data.frames, params, context))

            // Parse through exception if available
            const exception = err.entries.filter((e: any) => e.type === 'exception')
            exception?.forEach((exc: any) => {
                exc.data.values.forEach((val: any) => parseStacktrace(val.stacktrace.frames, params, context))
            })

            // TODO: Can we have an API response with both 'stacktrace' and 'exception' keys?
            //       How should we handle that scenario?
        })

        return context.annotations
    },

    async mentions(params: MentionsParams, settings: Settings): Promise<MentionsResult> {
        return []   // TODO: Fetch mentions from sentry platform
    }
}

export default sentry
