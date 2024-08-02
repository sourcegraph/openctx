import { Observable } from 'rxjs'

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

export function asyncGeneratorToObservable<T>(asyncGenerator: AsyncGenerator<T, void>): Observable<T> {
    return new Observable<T>(observer => {
        ;(async () => {
            try {
                for await (const value of asyncGenerator) {
                    observer.next(value)
                }
                observer.complete()
            } catch (error) {
                observer.error(error)
            }
        })()

        return () => {
            // If the AsyncGenerator has a return method, call it to clean up
            if (asyncGenerator.return) {
                asyncGenerator.return()
            }
        }
    })
}

export function isAsyncGenerator(value: any): value is AsyncGenerator<any, any, any> {
    if (value === null || typeof value !== 'object') {
        return false
    }

    return (
        typeof value.next === 'function' &&
        typeof value.throw === 'function' &&
        typeof value.return === 'function' &&
        typeof value[Symbol.asyncIterator] === 'function' &&
        value[Symbol.asyncIterator]() === value
    )
}
