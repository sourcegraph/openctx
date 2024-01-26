
export class HTTP {
    public url: string
    private token: string

    constructor(url: string, token: string) {
        this.url = url
        this.token = token
    }

    private headers(): any {
        return { 'Authorization': `Bearer ${this.token}` }
    }

    public async get(route: string): Promise<any> {
        const r: Response = await fetch(this.url + route, {
            method: 'GET',
            headers: this.headers()
        })

        if (r.status === 200) { return r }
        throw new Error(`GET "${this.url + route}" failed with ${r.status}`)
    }

    public async put(route: string, data: any): Promise<any> {
        const r: Response = await fetch(this.url + route, {
            method: 'PUT',
            headers: this.headers(),
            body: JSON.stringify(data)
        })

        if (r.status === 200) { return r }
        throw new Error(`PUT "${this.url + route}" failed with ${r.status}`)
    }

    public async post(route: string, data: any): Promise<any> {
        const r: Response = await fetch(this.url + route, {
            method: 'POST',
            headers: this.headers(),
            body: JSON.stringify(data)
        })

        if (r.status === 200) { return r }
        throw new Error(`POST "${this.url + route}" failed with ${r.status}`)
    }

    public async delete(route: string): Promise<any> {
        const r: Response = await fetch(this.url + route, {
            method: 'DELETE',
            headers: this.headers()
        })

        if (r.status === 200) { return r }
        throw new Error(`DELETE "${this.url + route}" failed with ${r.status}`)
    }
}
