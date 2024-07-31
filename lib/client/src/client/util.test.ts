import { Observable } from 'rxjs'
import { describe, expect, test } from 'vitest'
import { observableToAsyncGenerator } from './util.js'

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
