import { Observable } from 'rxjs'
import { describe, expect, test } from 'vitest'
import { asyncGeneratorToObservable, isAsyncGenerator, observableToAsyncGenerator } from './util.js'

describe('observableToAsyncGenerator', () => {
    test('observable that emits and completes', async () => {
        const testObservable = new Observable<number>(observer => {
            observer.next(1)
            observer.next(2)
            observer.complete()
        })

        const results: number[] = []
        for await (const value of observableToAsyncGenerator(testObservable)) {
            results.push(value)
        }
        expect(results).toEqual([1, 2])
    })

    test('observable that immediately completes', async () => {
        const testObservable = new Observable<number>(observer => {
            observer.complete()
        })

        const results: number[] = []
        for await (const value of observableToAsyncGenerator(testObservable)) {
            results.push(value)
        }
        expect(results).toEqual([])
    })

    test('observable that emits then errors', async () => {
        const testObservable = new Observable<number>(observer => {
            observer.next(1)
            observer.error('x')
        })

        const results: number[] = []
        let thrown: any
        try {
            for await (const value of observableToAsyncGenerator(testObservable)) {
                results.push(value)
            }
        } catch (error) {
            thrown = error
        }
        expect(results).toEqual([1])
        expect(thrown).toBe('x')
    })

    test('with an AbortSignal', async () => {
        const INTERVAL = 10
        const testObservable = new Observable<number>(observer => {
            let i = 1
            const intervalHandle = setInterval(() => {
                observer.next(i++)
            }, INTERVAL)
            return () => clearTimeout(intervalHandle)
        })

        const abortController = new AbortController()
        const results: number[] = []
        for await (const value of observableToAsyncGenerator(testObservable, abortController.signal)) {
            results.push(value)
            if (value === 5) {
                abortController.abort()
            }
        }
        expect(results).toEqual([1, 2, 3, 4, 5])
    })
})
describe('asyncGeneratorToObservable', () => {
    function readObservable(observable: Observable<number>): Promise<number[]> {
        return new Promise<number[]>(resolve => {
            const results: number[] = []
            observable.subscribe({
                next: value => results.push(value),
                complete: () => resolve(results),
            })
        })
    }

    test('async generator that yields and completes', async () => {
        const observable = asyncGeneratorToObservable(
            (async function* () {
                yield 1
                yield 2
                yield 3
            })(),
        )
        expect(await readObservable(observable)).toEqual([1, 2, 3])
    })

    test('async generator that throws an error', async () => {
        const ERROR = new Error('Test error')
        async function* generator() {
            yield 1
            throw ERROR
        }

        const observable = asyncGeneratorToObservable(generator())
        const results: number[] = []
        let error: Error | null = null

        await new Promise<void>(resolve => {
            observable.subscribe({
                next: value => results.push(value),
                error: err => {
                    error = err
                    resolve()
                },
                complete: () => resolve(),
            })
        })

        expect(results).toEqual([1])
        expect(error).toBe(ERROR)
    })

    test('async generator with no yields', async () => {
        async function* generator() {
            // Empty generator
        }

        const observable = asyncGeneratorToObservable(generator())
        let completed = false

        await new Promise<void>(resolve => {
            observable.subscribe({
                next: () => expect.fail('should not yield any values'),
                complete: () => {
                    completed = true
                    resolve()
                },
            })
        })

        expect(completed).toBe(true)
    })
})

describe('isAsyncGenerator', () => {
    test('true for valid async generator', () => {
        async function* validAsyncGenerator() {
            yield 1
        }
        expect(isAsyncGenerator(validAsyncGenerator())).toBe(true)
    })

    test('false for other values', () => {
        expect(isAsyncGenerator(42)).toBe(false)
        expect(isAsyncGenerator('string')).toBe(false)
        expect(isAsyncGenerator(true)).toBe(false)
        expect(isAsyncGenerator(undefined)).toBe(false)
        expect(isAsyncGenerator(null)).toBe(false)
        expect(isAsyncGenerator({})).toBe(false)
        expect(isAsyncGenerator(function regularFunction() {})).toBe(false)
    })

    test('false for async functions', () => {
        async function asyncFunction() {}
        expect(isAsyncGenerator(asyncFunction)).toBe(false)
    })

    test('false for non-async generator functions', () => {
        function* generatorFunction() {
            yield 1
        }
        expect(isAsyncGenerator(generatorFunction())).toBe(false)
    })

    test('false for objects with some but not all required methods', () => {
        const incompleteObject = {
            next: () => {},
            throw: () => {},
            [Symbol.asyncIterator]: function () {
                return this
            },
        }
        expect(isAsyncGenerator(incompleteObject)).toBe(false)
    })

    test('false for objects with all methods but incorrect Symbol.asyncIterator implementation', () => {
        const incorrectObject = {
            next: () => {},
            throw: () => {},
            return: () => {},
            [Symbol.asyncIterator]: () => ({}),
        }
        expect(isAsyncGenerator(incorrectObject)).toBe(false)
    })
})
