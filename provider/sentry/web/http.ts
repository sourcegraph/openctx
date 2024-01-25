
export class HTTP {
    url: string
    token: string

    constructor(url: string, token: string) {
        this.url = url
        this.token = token
    }

    headers() {
        return {'Authorization': `Bearer ${this.token}`}
    }

    async get(route: string): Promise<any> {
        const r: Response = await fetch(this.url + route, {
            method: 'GET',
            headers: this.headers()
        })

        if (r.status === 200) return r
        throw Error(`GET "${this.url + route}" failed with ${r.status}`)
    }

    async put(route: string, data: any): Promise<any> {
        const r: Response = await fetch(this.url + route, {
            method: "PUT",
            headers: this.headers(),
            body: JSON.stringify(data)
        })

        if (r.status === 200) return r
        throw Error(`PUT "${this.url + route}" failed with ${r.status}`)
    }

    async post(route: string, data: any): Promise<any> {
        const r: Response = await fetch(this.url + route, {
            method: "POST",
            headers: this.headers(),
            body: JSON.stringify(data)
        })

        if (r.status === 200) return r
        throw Error(`POST "${this.url + route}" failed with ${r.status}`)
    }

    async delete(route: string): Promise<any> {
        const r: Response = await fetch(this.url + route, {
            method: "DELETE",
            headers: this.headers()
        })

        if (r.status === 200) return r
        throw Error(`DELETE "${this.url + route}" failed with ${r.status}`)
    }
}