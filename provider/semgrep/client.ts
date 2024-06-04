import type { Finding, Findings } from './api.js'
import type { Settings } from './index.js'

export default class API {
    private url: string
    private repo: string
    private token: string
    private deployment: string

    constructor(settings: Settings) {
        this.token = settings.token
        this.repo = settings.repo || ''
        this.deployment = settings.deployment || ''
        this.url = 'https://semgrep.dev/api/v1'
    }

    private timeout(): any {
        const ctrl = new AbortController()
        setTimeout(() => ctrl.abort(), 5000)
        return ctrl.signal
    }

    private headers(): any {
        return { Authorization: `Bearer ${this.token}` }
    }

    public settings(): Settings {
        return {
            repo: this.repo,
            token: this.token,
            deployment: this.deployment,
        }
    }

    public async findings(fnum: number | null = null): Promise<Findings> {
        const url = `${this.url}/deployments/${this.deployment}/findings`
        const params = { headers: this.headers(), signal: this.timeout() }
        const res = await fetch(url, params)
        if (!res.ok) {
            console.error(`Failed to fetch findings for deployment ${this.deployment}`)
            return [] as Findings
        }

        const all: Findings = (await res.json()).findings ?? []
        const repos: Findings = !this.repo
            ? all
            : all.filter((f: Finding) => this.repo === f.repository.name)
        return !fnum ? repos : repos.filter((f: Finding) => f.id === fnum)
    }
}
