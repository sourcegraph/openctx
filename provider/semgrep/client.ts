
import type { Settings } from './index.js';
import type { Finding, Findings } from './api.js'


export default class API {
    private abortSig: any
    private url: string
    private token: string
    private deployment: string

    constructor(settings: Settings) {
        this.abortSig = null
        this.token = settings.token
        this.deployment = settings.deployment
        this.url = "https://semgrep.dev/api/v1/"
    }

    private abort(): any {
        if (this.abortSig === null) {
            const abc = new AbortController()
            setTimeout(() => abc.abort(), 5000)
            this.abortSig = abc.signal
        }
        return this.abortSig
    }

    public headers(): any {
        return {'Authorization': `Bearer ${this.token}`}
    }

    public async findings(): Promise<any> {
        const res = await fetch(this.url + `/deployments/${this.deployment}/findings`, 
                                { headers: this.headers(), signal: this.abort() })
        if (!res.ok) {
            console.error(`Failed to fetch findings for deployment ${this.deployment}`)
            return []
        }
        return await res.json()
    }

    public async get(fno: string): Promise<any> {
        if (fno === null || fno === undefined) {
            throw Error("Bad Request :: Findings ID not specifiied")
        }
        return (await this.findings() as Findings).filter((f: Finding) => (f.id === fno))
    }
}