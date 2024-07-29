import type { Observable } from 'rxjs'

export async function* observableToAsyncGenerator<T>(
    observable: Observable<T>,
    signal?: AbortSignal,
): AsyncGenerator<T> {
    const queue: T[] = []
    let thrown: unknown
    let resolve: (() => void) | undefined
    let reject: ((error: unknown) => void) | undefined
    let finished = false

    const subscription = observable.subscribe({
        next: value => {
            queue.push(value)
            resolve?.()
            resolve = undefined
        },
        error: error => {
            thrown = error
            reject?.(thrown)
            reject = undefined
        },
        complete: () => {
            finished = true
            resolve?.()
            resolve = undefined
        },
    })

    let removeAbortListener: (() => void) | undefined = undefined
    if (signal) {
        const handler = () => {
            resolve?.()
            resolve = undefined
            finished = true
        }
        signal.addEventListener('abort', handler)
        removeAbortListener = () => {
            signal.removeEventListener('abort', handler)
        }
    }

    try {
        while (true) {
            if (queue.length > 0) {
                yield queue.shift()!
            } else if (thrown) {
                throw thrown
            } else if (finished) {
                break
            } else {
                await new Promise<void>((res, rej) => {
                    resolve = res
                    reject = rej
                })
            }
        }
    } finally {
        subscription.unsubscribe()
        removeAbortListener?.()
    }
}
