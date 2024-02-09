
// TODO: Remove this and fix subsequent warnings
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */

import { HTTP } from './http'
import { type Settings } from '../index'


export class Sentry {
    private http: HTTP
    private settings: Settings

    constructor(settings: Settings) {
        this.settings = settings
        this.http = new HTTP('https://sentry.io/api/0', this.settings.token)
    }

    /**
     * Returns a Sentry organization information.
     *
     * @param org - organization slug.
     */
    public async organization(org: string): Promise<any> {
        try {
            const r = await this.http.get(`/organizations/${org}/`)
            return r.json() ?? r.text
        } catch (e) {
            console.error(e)
        }
    }

    /**
     * Returns details of an individual project.
     * 
     * @param org - organization slug.
     * @param proj - project slug.
     */
    public async project(org: string, proj: string): Promise<any> {
        try {
            const r = await this.http.get(`/projects/${org}/${proj}/`)
            return r.json() ?? r.text
        } catch (e) {
            console.error(e)
        }
    }

    /**
     * Returns all issues for a project.
     *
     * @param org - organization slug.
     * @param proj - project slug.
     */
    public async issues(org: string, proj: string): Promise<any> {
        try {
            const r = await this.http.get(`/projects/${org}/${proj}/issues/`)
            return r.json() ?? r.text
        } catch (e) {
            console.error(e)
        }
    }

    /**
     * Returns all error events for a project with full body event payloads.
     *
     * @param org - organization slug
     * @param proj - project slug
     */
    public async errors(org: string, proj: string): Promise<any> {
        try {
            const r = await this.http.get(`/projects/${org}/${proj}/events/?full=true`)
            return r.json() ?? r.text
        } catch (e) {
            console.error(e)
        }
    }
}
