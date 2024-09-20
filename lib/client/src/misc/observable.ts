import {
    Observable,
    type ObservableLike,
    Subject,
    type Subscription,
    map,
    unsubscribe,
} from 'observable-fns'
import { AsyncSerialScheduler } from 'observable-fns/dist/_scheduler.js'

/**
 * A type helper to get the value type of an {@link Observable} (i.e., what it emits from `next`).
 */
export type ObservableValue<O> = O extends ObservableLike<infer V> ? V : never

export interface Unsubscribable {
    unsubscribe(): void
}

/**
 * Make a VS Code Disposable from an {@link Unsubscribable}.
 */
export function subscriptionDisposable(sub: Unsubscribable): { dispose(): void } {
    return { dispose: sub.unsubscribe.bind(sub) }
}

/**
 * @internal For testing only.
 */
export function observableOfSequence<T>(...values: T[]): Observable<T> {
    return new Observable<T>(observer => {
        for (const value of values) {
            observer.next(value)
        }
        observer.complete()
    })
}

/**
 * @internal For testing only.
 */
export function observableOfTimedSequence<T>(...values: (T | number)[]): Observable<T> {
    return new Observable<T>(observer => {
        let unsubscribed = false
        ;(async () => {
            for (const value of values) {
                if (unsubscribed) {
                    break
                }
                if (typeof value === 'number') {
                    await new Promise(resolve => setTimeout(resolve, value))
                } else {
                    observer.next(value)
                }
            }
            observer.complete()
        })()
        return () => {
            unsubscribed = true
        }
    })
}

/**
 * Return the first value emitted by an {@link Observable}, or throw an error if the observable
 * completes without emitting a value.
 */
export async function firstValueFrom<T>(
    observable: Observable<T>,
    config?: { defaultValue?: T },
): Promise<T> {
    return new Promise<T>((resolve, reject) => {
        const subscription = observable.subscribe({
            next: value => {
                subscription.unsubscribe()
                resolve(value)
            },
            error: reject,
            complete: () => {
                if (config?.defaultValue !== undefined) {
                    resolve(config.defaultValue)
                } else {
                    reject(new Error('EmptyError: firstValueFrom observable did not emit a value'))
                }
            },
        })
    })
}

/**
 * Return all values emitted by an {@link Observable}.
 */
export async function allValuesFrom<T>(observable: Observable<T>): Promise<T[]> {
    return new Promise<T[]>((resolve, reject) => {
        const values: T[] = []
        observable.subscribe({
            next: value => values.push(value),
            error: reject,
            complete: () => resolve(values),
        })
    })
}

/** ESNext will have Promise.withResolvers built in. */
function promiseWithResolvers<T>(): {
    promise: Promise<T>
    resolve: (value: T) => void
    reject: (error: any) => void
} {
    let resolve: (value: T) => void = () => {}
    let reject: (error: any) => void = () => {}
    const promise = new Promise<T>((_resolve, _reject) => {
        resolve = _resolve
        reject = _reject
    })
    return { promise, resolve, reject }
}

/**
 * @internal For testing only.
 */
export function readValuesFrom<T>(observable: Observable<T>): {
    values: T[]
    done: Promise<void>
    unsubscribe(): void
} {
    const values: T[] = []
    const { promise, resolve, reject } = promiseWithResolvers<void>()
    const subscription = observable.subscribe({
        next: value => values.push(value),
        error: reject,
        complete: resolve,
    })
    return {
        values,
        done: promise,
        unsubscribe: () => {
            subscription.unsubscribe()
            resolve()
        },
    }
}

/**
 * Prefer using {@link promiseFactoryToObservable} instead because it supports aborting long-running
 * operations.
 *
 * @internal For testing only.
 */
export function promiseToObservable<T>(promise: Promise<T>): Observable<T> {
    return new Observable<T>(observer => {
        promise
            .then(value => {
                observer.next(value)
                observer.complete()
            })
            .catch(error => {
                observer.error(error)
            })
    })
}

export function promiseOrObservableToObservable<T>(
    promiseOrObservable: Promise<T> | ObservableLike<T>,
): Observable<T> {
    return promiseOrObservable instanceof Promise
        ? promiseToObservable(promiseOrObservable)
        : Observable.from(promiseOrObservable)
}

/**
 * Create an {@link Observable} that emits the result of a promise (which created by the abortable
 * {@link factory} function).
 */
export function promiseFactoryToObservable<T>(
    factory: (signal: AbortSignal) => Promise<T>,
): Observable<T> {
    return new Observable<T>(observer => {
        let unsubscribed = false
        const abortController = new AbortController()
        const signal = abortController.signal

        const run = async () => {
            try {
                const value = await factory(signal)
                if (!unsubscribed) {
                    observer.next(value)
                    observer.complete()
                }
            } catch (error) {
                if (!unsubscribed) {
                    if (signal.aborted) {
                        observer.complete()
                    } else {
                        observer.error(error)
                    }
                }
            }
        }
        run()

        return () => {
            unsubscribed = true
            abortController.abort()
        }
    })
}

/**
 * An empty {@link Observable}, which emits no values and completes immediately.
 */
export const EMPTY = new Observable<never>(observer => {
    observer.complete()
})

/**
 * An observable that never emits, errors, nor completes.
 */
export const NEVER: Observable<never> = new Observable<never>(() => {})

/**
 * Combine the latest values from multiple {@link Observable}s into a single {@link Observable} that
 * emits only after all input observables have emitted once.
 */
export function combineLatest<T1>(observables: [Observable<T1>]): Observable<[T1]>
export function combineLatest<T1, T2>(
    observables: [Observable<T1>, Observable<T2>],
): Observable<[T1, T2]>
export function combineLatest<T1, T2, T3>(
    observables: [Observable<T1>, Observable<T2>, Observable<T3>],
): Observable<[T1, T2, T3]>
export function combineLatest<T1, T2, T3, T4>(
    observables: [Observable<T1>, Observable<T2>, Observable<T3>, Observable<T4>],
): Observable<[T1, T2, T3, T4]>
export function combineLatest<T>(observables: Array<Observable<T>>): Observable<T[]>
export function combineLatest<T>(observables: Array<Observable<T>>): Observable<T[]> {
    if (observables.length === 0) {
        return EMPTY
    }
    return new Observable<T[]>(observer => {
        const latestValues: T[] = new Array(observables.length)
        const hasValue: boolean[] = new Array(observables.length).fill(false)
        let completed = 0
        const subscriptions: Subscription<T>[] = []

        for (let index = 0; index < observables.length; index++) {
            const observable = observables[index]
            subscriptions.push(
                observable.subscribe({
                    next(value: T) {
                        latestValues[index] = value
                        hasValue[index] = true
                        if (hasValue.every(Boolean)) {
                            observer.next([...latestValues])
                        }
                    },
                    error(err: any) {
                        observer.error(err)
                    },
                    complete() {
                        completed++
                        if (completed === observables.length) {
                            observer.complete()
                        }
                    },
                }),
            )
        }

        return () => {
            for (const subscription of subscriptions) {
                subscription.unsubscribe()
            }
        }
    })
}

/**
 * Return an Observable that emits the latest value from the given Observable.
 */
export function memoizeLastValue<P extends unknown[], T>(
    factory: (...args: P) => Observable<T>,
    keyFn: (args: P) => string | number,
): (...args: P) => Observable<T> {
    const memo = new Map<string | number, T | undefined>()

    return (...args: P): Observable<T> => {
        const key = keyFn(args)

        return new Observable<T>(observer => {
            // Emit last value immediately if it exists.
            if (memo.has(key)) {
                observer.next(memo.get(key)!)
            }

            const subscription = factory(...args).subscribe({
                next: value => {
                    memo.set(key, value)
                    observer.next(value)
                },
                error: error => observer.error(error),
                complete: () => observer.complete(),
            })

            return () => {
                subscription.unsubscribe()
            }
        })
    }
}

interface VSCodeDisposable {
    dispose(): void
}

type VSCodeEvent<T> = (
    listener: (e: T) => any,
    thisArgs?: any,
    disposables?: VSCodeDisposable[],
) => VSCodeDisposable

/**
 * Create an Observable from a VS Code event.
 */
export function fromVSCodeEvent<T>(
    event: VSCodeEvent<T>,
    getInitialValue?: () => T | Promise<T>,
): Observable<T> {
    return new Observable(observer => {
        if (getInitialValue) {
            const initialValue = getInitialValue()
            if (initialValue instanceof Promise) {
                initialValue.then(value => {
                    observer.next(value)
                })
            } else {
                observer.next(initialValue)
            }
        }

        let disposed = false
        const eventDisposable = event(value => {
            if (!disposed) {
                observer.next(value)
            }
        })

        return () => {
            disposed = true
            eventDisposable.dispose()
            observer.complete()
        }
    })
}

export function pluck<T, K extends keyof T>(key: K): (input: ObservableLike<T>) => Observable<T[K]>
export function pluck<T, K1 extends keyof T, K2 extends keyof T[K1]>(
    key1: K1,
    key2: K2,
): (input: ObservableLike<T>) => Observable<T[K1][K2]>
export function pluck<T>(...keyPath: any[]): (input: ObservableLike<T>) => Observable<any> {
    return map(value => {
        let valueToReturn = value
        for (const key of keyPath) {
            valueToReturn = (valueToReturn as any)[key]
        }
        return valueToReturn
    })
}

export function pick<T, K extends keyof T>(
    key: K,
): (input: ObservableLike<T>) => Observable<Pick<T, K>> {
    return map(
        value =>
            ({
                [key]: value[key],
            }) as Pick<T, K>,
    )
}

// biome-ignore lint/suspicious/noConfusingVoidType:
export type UnsubscribableLike = Unsubscribable | (() => void) | void | null

export function shareReplay<T>(): (observable: ObservableLike<T>) => Observable<T> {
    return (observable: ObservableLike<T>): Observable<T> => {
        const subject = new Subject<T>()
        let subscription: UnsubscribableLike = null
        let hasValue = false
        let latestValue: T
        let refCount = 0

        return new Observable<T>(observer => {
            refCount++
            if (hasValue) {
                observer.next(latestValue)
            }
            if (!subscription) {
                subscription = observable.subscribe({
                    next: value => {
                        hasValue = true
                        latestValue = value
                        subject.next(value)
                    },
                    error: error => subject.error(error),
                    complete: () => subject.complete(),
                })
            }
            const innerSub = subject.subscribe(observer)
            return () => {
                refCount--
                innerSub.unsubscribe()
                if (refCount === 0) {
                    if (subscription) {
                        unsubscribe(subscription)
                        subscription = null
                    }
                    hasValue = false
                }
            }
        })
    }
}

export function distinctUntilChanged<T>(
    isEqualFn: (a: T, b: T) => boolean = isEqualJSON,
): (observable: ObservableLike<T>) => Observable<T> {
    return (observable: ObservableLike<T>): Observable<T> => {
        return new Observable<T>(observer => {
            let lastInput: T | typeof NO_VALUES_YET = NO_VALUES_YET

            const scheduler = new AsyncSerialScheduler(observer)

            const subscription = observable.subscribe({
                complete() {
                    scheduler.complete()
                },
                error(error) {
                    scheduler.error(error)
                },
                next(input) {
                    scheduler.schedule(async next => {
                        if (lastInput === NO_VALUES_YET || !isEqualFn(lastInput as T, input)) {
                            lastInput = input
                            next(input)
                        }
                    })
                },
            })
            return () => unsubscribe(subscription)
        })
    }
}

/**
 * Whether {@link value} is equivalent to {@link other} in terms of JSON serialization.
 */
export function isEqualJSON<T>(value: T, other: T): boolean {
    if (value === other) {
        return true
    }

    if (value == null || other == null || typeof value !== 'object' || typeof other !== 'object') {
        return false
    }

    const isValueArray = Array.isArray(value)
    const isOtherArray = Array.isArray(other)
    if (isValueArray !== isOtherArray) {
        return false
    }
    if (isValueArray && isOtherArray) {
        return (
            value.length === other.length &&
            value.every((value, index) => isEqualJSON(value, other[index]))
        )
    }

    const allKeys = new Set([...Object.keys(value), ...Object.keys(other)])
    for (const key of allKeys) {
        if (!isEqualJSON((value as any)[key], (other as any)[key])) {
            return false
        }
    }

    return true
}

interface Observer<T> {
    next: (value: T) => void
    error: (err: any) => void
    complete: () => void
}

export function tap<T>(
    observerOrNext?: Partial<Observer<T>> | ((value: T) => void),
): (input: ObservableLike<T>) => Observable<T> {
    return (input: ObservableLike<T>) =>
        new Observable<T>(observer => {
            const tapObserver: Partial<Observer<T>> =
                typeof observerOrNext === 'function' ? { next: observerOrNext } : observerOrNext || {}

            return Observable.from(input).subscribe({
                next: value => {
                    try {
                        tapObserver.next?.(value)
                    } catch (err) {
                        observer.error(err)
                    }
                    observer.next(value)
                },
                error: err => {
                    tapObserver.error?.(err)
                    observer.error(err)
                },
                complete: () => {
                    tapObserver.complete?.()
                    observer.complete()
                },
            })
        })
}

/** Sentinel value. */
const NO_VALUES_YET: Record<string, never> = {}

export function mergeMap<T, R>(
    project: (value: T, index: number) => ObservableLike<R>,
): (observable: ObservableLike<T>) => Observable<R> {
    return (observable: ObservableLike<T>): Observable<R> => {
        return new Observable<R>(observer => {
            let index = 0
            const innerSubscriptions = new Set<UnsubscribableLike>()
            let outerCompleted = false

            const checkComplete = () => {
                if (outerCompleted && innerSubscriptions.size === 0) {
                    observer.complete()
                }
            }

            const outerSubscription = observable.subscribe({
                next(value) {
                    const innerObservable = project(value, index++)
                    const innerSubscription = innerObservable.subscribe({
                        next(innerValue) {
                            observer.next(innerValue)
                        },
                        error(err) {
                            observer.error(err)
                        },
                        complete() {
                            innerSubscriptions.delete(innerSubscription)
                            checkComplete()
                        },
                    })
                    innerSubscriptions.add(innerSubscription)
                },
                error(err) {
                    observer.error(err)
                },
                complete() {
                    outerCompleted = true
                    checkComplete()
                },
            })

            return () => {
                unsubscribe(outerSubscription)
                for (const innerSubscription of innerSubscriptions) {
                    if (innerSubscription) {
                        unsubscribe(innerSubscription)
                    }
                }
            }
        })
    }
}

export function switchMap<T, R>(
    project: (value: T, index: number) => ObservableLike<R>,
): (source: ObservableLike<T>) => Observable<R> {
    return (source: ObservableLike<T>): Observable<R> => {
        return new Observable<R>(observer => {
            let index = 0
            let innerSubscription: UnsubscribableLike | null = null
            let outerCompleted = false

            const checkComplete = () => {
                if (outerCompleted && !innerSubscription) {
                    observer.complete()
                }
            }

            const outerSubscription = source.subscribe({
                next(value) {
                    if (innerSubscription) {
                        unsubscribe(innerSubscription)
                        innerSubscription = null
                    }

                    const innerObservable = project(value, index++)
                    innerSubscription = innerObservable.subscribe({
                        next(innerValue) {
                            observer.next(innerValue)
                        },
                        error(err) {
                            observer.error(err)
                        },
                        complete() {
                            innerSubscription = null
                            checkComplete()
                        },
                    })
                },
                error(err) {
                    observer.error(err)
                },
                complete() {
                    outerCompleted = true
                    checkComplete()
                },
            })

            return () => {
                unsubscribe(outerSubscription)
                if (innerSubscription) {
                    unsubscribe(innerSubscription)
                }
            }
        })
    }
}

export function defer<R>(observableFactory: () => ObservableLike<R>): Observable<R> {
    return new Observable<R>(observer => {
        let innerSubscription: UnsubscribableLike | undefined

        try {
            const result = observableFactory()
            innerSubscription = result.subscribe({
                next(value) {
                    observer.next(value)
                },
                error(err) {
                    observer.error(err)
                },
                complete() {
                    observer.complete()
                },
            })
        } catch (err) {
            observer.error(err)
        }

        return () => {
            if (innerSubscription) {
                unsubscribe(innerSubscription)
            }
        }
    })
}

export function startWith<T, R>(value: R): (source: ObservableLike<T>) => Observable<R | T> {
    return (source: ObservableLike<T>) =>
        new Observable<R | T>(observer => {
            let sourceSubscription: UnsubscribableLike | undefined

            try {
                observer.next(value)

                sourceSubscription = source.subscribe({
                    next(val) {
                        observer.next(val)
                    },
                    error(err) {
                        observer.error(err)
                    },
                    complete() {
                        observer.complete()
                    },
                })
            } catch (err) {
                observer.error(err)
            }

            return () => {
                if (sourceSubscription) {
                    unsubscribe(sourceSubscription)
                }
            }
        })
}

export function catchError<T, R>(
    handler: (error: any) => ObservableLike<R>,
): (source: ObservableLike<T>) => Observable<T | R> {
    return (source: ObservableLike<T>) =>
        new Observable<T | R>(observer => {
            let handlerSubscription: UnsubscribableLike | undefined
            const sourceSubscription = source.subscribe({
                next(value) {
                    observer.next(value)
                },
                error(err) {
                    try {
                        const fallback = handler(err)
                        handlerSubscription = fallback.subscribe({
                            next(value) {
                                observer.next(value)
                            },
                            error(innerErr) {
                                observer.error(innerErr)
                            },
                            complete() {
                                observer.complete()
                            },
                        })
                    } catch (handlerError) {
                        observer.error(handlerError)
                    }
                },
                complete() {
                    observer.complete()
                },
            })

            return () => {
                unsubscribe(sourceSubscription)
                if (handlerSubscription) {
                    unsubscribe(handlerSubscription)
                }
            }
        })
}

export function take<T>(count: number): (source: ObservableLike<T>) => Observable<T> {
    return (source: ObservableLike<T>) =>
        new Observable<T>(observer => {
            let taken = 0
            const sourceSubscription = source.subscribe({
                next(value) {
                    if (taken < count) {
                        observer.next(value)
                        taken++
                        if (taken === count) {
                            observer.complete()
                            unsubscribe(sourceSubscription)
                        }
                    }
                },
                error(err) {
                    observer.error(err)
                },
                complete() {
                    observer.complete()
                },
            })

            return () => {
                unsubscribe(sourceSubscription)
            }
        })
}

export function concatMap<T, R>(
    project: (value: T, index: number) => ObservableLike<R>,
): (source: ObservableLike<T>) => Observable<R> {
    return (source: ObservableLike<T>) =>
        new Observable<R>(observer => {
            let index = 0
            let isOuterCompleted = false
            let innerSubscription: UnsubscribableLike | null = null
            const outerSubscription = source.subscribe({
                next(value) {
                    try {
                        const innerObservable = project(value, index++)
                        if (innerSubscription) {
                            unsubscribe(innerSubscription)
                        }
                        innerSubscription = innerObservable.subscribe({
                            next(innerValue) {
                                observer.next(innerValue)
                            },
                            error(err) {
                                observer.error(err)
                            },
                            complete() {
                                innerSubscription = null
                                if (isOuterCompleted && !innerSubscription) {
                                    observer.complete()
                                }
                            },
                        })
                    } catch (err) {
                        observer.error(err)
                    }
                },
                error(err) {
                    observer.error(err)
                },
                complete() {
                    isOuterCompleted = true
                    if (!innerSubscription) {
                        observer.complete()
                    }
                },
            })

            return () => {
                unsubscribe(outerSubscription)
                if (innerSubscription) {
                    unsubscribe(innerSubscription)
                }
            }
        })
}

export function timer(dueTime: number): Observable<void> {
    return new Observable<void>(observer => {
        const timer = setTimeout(() => {
            observer.next()
            observer.complete()
        }, dueTime)

        return () => {
            clearTimeout(timer)
        }
    })
}

export function isObservableOrInteropObservable<T>(value: unknown): value is ObservableLike<T> {
    if (value === null || typeof value !== 'object') {
        return false
    }
    return typeof (value as any)[Symbol.observable] === 'function'
}

export interface AddRemoveEventListener<E> {
    addEventListener(type: string, listener: (evt: E) => void): void
    removeEventListener(type: string, listener: (evt: E) => void): void
}

export function fromEvent<E>(target: AddRemoveEventListener<E>, eventName: string): Observable<E> {
    return new Observable<E>(observer => {
        const listener = (event: E) => {
            observer.next(event)
        }

        target.addEventListener(eventName, listener)

        return () => {
            target.removeEventListener(eventName, listener)
        }
    })
}

export function debounceTime<T>(duration: number): (source: ObservableLike<T>) => Observable<T> {
    return (source: ObservableLike<T>) =>
        new Observable<T>(observer => {
            let timeoutId: ReturnType<typeof setTimeout> | null = null
            let latestValue: T | null = null
            let hasValue = false

            const subscription = source.subscribe({
                next: value => {
                    latestValue = value
                    hasValue = true

                    if (timeoutId === null) {
                        timeoutId = setTimeout(() => {
                            if (hasValue) {
                                observer.next(latestValue!)
                                hasValue = false
                            }
                            timeoutId = null
                        }, duration)
                    }
                },
                error: err => observer.error(err),
                complete: () => {
                    if (timeoutId !== null) {
                        clearTimeout(timeoutId)
                    }
                    if (hasValue) {
                        observer.next(latestValue!)
                    }
                    observer.complete()
                },
            })

            return () => {
                unsubscribe(subscription)
                if (timeoutId !== null) {
                    clearTimeout(timeoutId)
                }
            }
        })
}

export function throttleTime<T>(
    duration: number,
    options: { leading: true; trailing: true },
): (source: ObservableLike<T>) => Observable<T> {
    return (source: ObservableLike<T>) =>
        new Observable<T>(observer => {
            let lastEmitTime = 0
            let timeoutId: ReturnType<typeof setTimeout> | null = null
            let latestValue: T | null = null
            let hasValue = false

            const subscription = source.subscribe({
                next: value => {
                    const currentTime = Date.now()
                    latestValue = value
                    hasValue = true

                    if (currentTime - lastEmitTime >= duration) {
                        observer.next(value)
                        lastEmitTime = currentTime
                        hasValue = false
                    } else if (timeoutId === null) {
                        timeoutId = setTimeout(
                            () => {
                                if (hasValue) {
                                    observer.next(latestValue!)
                                    lastEmitTime = Date.now()
                                    hasValue = false
                                }
                                timeoutId = null
                            },
                            duration - (currentTime - lastEmitTime),
                        )
                    }

                    // Trigger on leading edge
                    if (lastEmitTime === 0) {
                        observer.next(value)
                        lastEmitTime = currentTime
                        hasValue = false
                    }
                },
                error: err => observer.error(err),
                complete: () => {
                    if (timeoutId !== null) {
                        clearTimeout(timeoutId)
                    }
                    if (hasValue) {
                        observer.next(latestValue!)
                    }
                    observer.complete()
                },
            })

            return () => {
                unsubscribe(subscription)
                if (timeoutId !== null) {
                    clearTimeout(timeoutId)
                }
            }
        })
}

export function filter<T>(test: (input: T) => Promise<boolean> | boolean) {
    return (observable: ObservableLike<T>): Observable<T> => {
        return new Observable<T>(observer => {
            const scheduler = new AsyncSerialScheduler(observer)

            const subscription = observable.subscribe({
                complete() {
                    scheduler.complete()
                },
                error(error) {
                    scheduler.error(error)
                },
                next(input) {
                    scheduler.schedule(async next => {
                        if (await test(input)) {
                            next(input)
                        }
                    })
                },
            })
            return () => unsubscribe(subscription)
        })
    }
}

export type ObservableInputTuple<T> = {
    [K in keyof T]: ObservableLike<T[K]>
}

export function concat<T extends readonly unknown[]>(
    ...inputs: [...ObservableInputTuple<T>]
): Observable<T[number]> {
    return new Observable<T[number]>(observer => {
        let currentIndex = 0
        let currentSubscription: UnsubscribableLike = null

        function subscribeToNext() {
            if (currentIndex >= inputs.length) {
                observer.complete()
                return
            }

            const input = inputs[currentIndex]
            currentSubscription = input.subscribe({
                next: value => observer.next(value),
                error: err => observer.error(err),
                complete: () => {
                    currentIndex++
                    subscribeToNext()
                },
            })
        }

        subscribeToNext()

        return () => {
            if (currentSubscription) {
                unsubscribe(currentSubscription)
            }
        }
    })
}
