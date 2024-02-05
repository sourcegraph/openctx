
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
        // console.log(`'params': ${JSON.stringify(params, null, 2)}`)

        const client: Sentry = new Sentry(settings)
        const result: AnnotationsResult = { items: [], annotations: [] }

        // Fetch errors from Sentry
        const errs: any = await client.errors(settings.organization, settings.project)

        // Gather issues for the current file
        const issues = Object.create(null)
        errs.forEach((err: any) => {
            err.entries.forEach((entry: any) => {
                // console.log(`${entry.data.formatted}: ${entry.data.frames}`)
                const frames: string = entry.data.frames ?? []
                const title: string = entry.data.formatted ?? 'Unknown Error'
                issues[title] = (issues[title] ?? []).concat(frames)
            })
        })

        for (const [title, frames] of Object.entries(issues)) {
            Object.values(frames).forEach(frame => {
                if (frame.lineNo <= params.content.split(/\r?\n/).length) {
                    result.items.push({ id: frame.lineNo, title: `🔺 ${title}` })
                    result.annotations.push({
                        item: { id: frame.lineNo },
                        range: {
                            start: { line: frame.lineNo, character: 0 },
                            end: { line: frame.lineNo, character: 1 }
                        }
                    })
                }
            })
        }

        console.log(`result: ${JSON.stringify(result, null, 2)}`)
        return result
    },
}

export default sentry
