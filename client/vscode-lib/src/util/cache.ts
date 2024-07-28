export class Cache<T> {
    private cache: Map<string, { value: T }> = new Map()
    private ttlMs: number

    constructor(opts: { ttlMs: number }) {
        this.ttlMs = opts.ttlMs
    }

    async getOrFill(key: string, fill: () => Promise<T>): Promise<T> {
        const entry = this.cache.get(key)
        if (entry) {
            return entry.value
        }

        const value = await fill()

        this.cache.set(key, { value })
        const timeout = setTimeout(() => this.cache.delete(key), this.ttlMs)
        if (typeof timeout !== 'number' && 'unref' in timeout) timeout.unref()

        return value
    }
}

/** resolves promise, but will return defaultValue if promise throws or takes longer than delay ms */
export async function bestEffort<T>(
    promise: Promise<T>,
    opts: {
        defaultValue: T
        delay: number
    }
): Promise<T> {
    let id: ReturnType<typeof setTimeout> | undefined
    const timeout = new Promise<T>((resolve, _) => {
        id = setTimeout(resolve, opts.delay, opts.defaultValue)
        if (typeof id !== 'number' && 'unref' in id) id.unref()
    })
    try {
        return await Promise.race([promise, timeout])
    } catch {
        return opts.defaultValue
    } finally {
        if (id) {
            clearTimeout(id)
        }
    }
}
