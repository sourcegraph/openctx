import { Observable, Subject } from 'observable-fns'
import { afterEach, describe, expect, test, vi } from 'vitest'
import {
    type ObservableValue,
    allValuesFrom,
    combineLatest,
    distinctUntilChanged,
    firstValueFrom,
    fromVSCodeEvent,
    memoizeLastValue,
    observableOfSequence,
    observableOfTimedSequence,
    promiseFactoryToObservable,
    readValuesFrom,
    shareReplay,
    switchMap,
} from './observable.js'

describe('firstValueFrom', () => {
    test('gets first value', async () => {
        const observable = observableOfSequence(1, 2)
        expect(await firstValueFrom(observable)).toBe(1)
    })
})

describe('allValuesFrom', () => {
    test('gets first value', async () => {
        const observable = observableOfSequence(1, 2)
        expect(await allValuesFrom(observable)).toStrictEqual([1, 2])
    })
})

describe('promiseFactoryToObservable', () => {
    test('emits resolved value and completes', async () => {
        const observable = promiseFactoryToObservable(() => Promise.resolve('test value'))
        expect(await allValuesFrom(observable)).toEqual(['test value'])
    })

    test('emits error when promise rejects', async () => {
        const observable = promiseFactoryToObservable(() => Promise.reject(new Error('test error')))
        await expect(allValuesFrom(observable)).rejects.toThrow('test error')
    })

    test('completes without emitting when aborted', async () => {
        vi.useFakeTimers()
        const observable = promiseFactoryToObservable(
            () =>
                new Promise<string>(resolve => {
                    setTimeout(() => resolve('test value'), 1000)
                }),
        )
        const { values, done, unsubscribe } = readValuesFrom(observable)
        unsubscribe()
        await done
        expect(values).toEqual([])
        vi.useRealTimers()
    })
})

describe('combineLatest', { timeout: 500 }, () => {
    afterEach(() => {
        vi.useRealTimers()
    })

    test('combines latest values (sync)', async () => {
        const observable = combineLatest([
            observableOfSequence('A', 'B'),
            observableOfSequence('x', 'y'),
        ])
        expect(await allValuesFrom(observable)).toEqual<ObservableValue<typeof observable>[]>([
            ['B', 'x'],
            ['B', 'y'],
        ])
    })

    test('combines latest values (async)', async () => {
        const observable = combineLatest([
            observableOfTimedSequence(0, 'A', 0, 'B'),
            observableOfTimedSequence(0, 'x', 0, 'y'),
        ])
        expect(await allValuesFrom(observable)).toEqual<ObservableValue<typeof observable>[]>([
            ['A', 'x'],
            ['B', 'x'],
            ['B', 'y'],
        ])
    })

    test('handles undefined value', async () => {
        const observable = combineLatest([
            observableOfSequence(undefined),
            observableOfSequence(1, undefined),
        ])
        expect(await allValuesFrom(observable)).toEqual<ObservableValue<typeof observable>[]>([
            [undefined, 1],
            [undefined, undefined],
        ])
    })

    test('handles empty input', async () => {
        expect(await allValuesFrom(combineLatest([] as any))).toEqual([])
    })

    test('keeps going after one completes', async () => {
        const completesAfterC = observableOfTimedSequence(0, 'A', 0, 'B', 0, 'C')
        const completesAfterX = observableOfTimedSequence(0, 'X')
        const observable = combineLatest([completesAfterC, completesAfterX])
        expect(await allValuesFrom(observable)).toEqual<ObservableValue<typeof observable>[]>([
            ['A', 'X'],
            ['B', 'X'],
            ['C', 'X'],
        ])
    })

    test('propagates unsubscription', async () => {
        vi.useFakeTimers()
        const observable = combineLatest([observableOfTimedSequence(10, 'A', 10, 'B')])
        const { values, done, unsubscribe } = readValuesFrom(observable)
        await vi.advanceTimersByTimeAsync(10)
        unsubscribe()
        await done
        expect(values).toEqual<typeof values>([['A']])
    })
})

describe('memoizeLastValue', () => {
    test('memoizes and emits the latest value', async () => {
        let subscriptions = 0
        const factory = vi.fn(
            (x: number) =>
                new Observable<string>(observer => {
                    subscriptions++
                    observer.next(`Value ${x}, subscription ${subscriptions}`)
                    observer.complete()
                }),
        )

        const memoized = memoizeLastValue(factory, args => args[0])

        const result1 = await firstValueFrom(memoized(1))
        expect(result1).toBe('Value 1, subscription 1')
        expect(factory).toHaveBeenCalledTimes(1)

        const result2 = await allValuesFrom(memoized(1))
        expect(result2).toStrictEqual(['Value 1, subscription 1', 'Value 1, subscription 2'])
        expect(factory).toHaveBeenCalledTimes(2)

        const result3 = await firstValueFrom(memoized(2))
        expect(result3).toBe('Value 2, subscription 3')
        expect(factory).toHaveBeenCalledTimes(3)
    })
})

describe('fromVSCodeEvent', { timeout: 500 }, () => {
    afterEach(() => {
        vi.useRealTimers()
    })

    class SimpleEventEmitter<T> {
        private listeners: ((value: T) => void)[] = []

        event = (listener: (value: T) => void) => {
            this.listeners.push(listener)
            return {
                dispose: () => {
                    const index = this.listeners.indexOf(listener)
                    if (index > -1) {
                        this.listeners.splice(index, 1)
                    }
                },
            }
        }

        fire(value: T) {
            for (const listener of this.listeners) {
                listener(value)
            }
        }

        dispose() {
            this.listeners = []
        }
    }

    test('emits values from VS Code event', async () => {
        const eventEmitter = new SimpleEventEmitter<string>()
        const observable = fromVSCodeEvent(eventEmitter.event)

        const { values, done, unsubscribe } = readValuesFrom(observable)

        vi.useFakeTimers()
        eventEmitter.fire('first')
        eventEmitter.fire('second')
        eventEmitter.fire('third')
        eventEmitter.dispose()
        unsubscribe()
        await done

        expect(values).toEqual(['first', 'second', 'third'])
    })

    test('emits initial value if provided', async () => {
        const eventEmitter = new SimpleEventEmitter<string>()
        const observable = fromVSCodeEvent(eventEmitter.event, () => 'initial')

        vi.useFakeTimers()
        const { values, done, unsubscribe } = readValuesFrom(observable)

        eventEmitter.fire('next')
        await vi.runAllTimersAsync()
        eventEmitter.dispose()
        unsubscribe()
        await done

        expect(values).toEqual(['initial', 'next'])
    })

    test('unsubscribes correctly', async () => {
        const eventEmitter = new SimpleEventEmitter<string>()
        const observable = fromVSCodeEvent(eventEmitter.event)

        const { values, done, unsubscribe } = readValuesFrom(observable)

        eventEmitter.fire('first')
        unsubscribe()
        eventEmitter.fire('second')
        await done

        expect(values).toEqual(['first'])
    })
})

describe('distinctUntilChanged', () => {
    afterEach(() => {
        vi.useRealTimers()
    })

    test('supports multiple subscribers', async () => {
        vi.useFakeTimers()
        const observable = observableOfSequence('a', 'b', 'b', 'c').pipe(distinctUntilChanged())
        const reader1 = readValuesFrom(observable)
        const reader2 = readValuesFrom(observable)

        await vi.runAllTimersAsync()
        reader1.unsubscribe()
        reader2.unsubscribe()
        await reader1.done
        await reader2.done

        const WANT: typeof reader1.values = ['a', 'b', 'c']
        expect.soft(reader1.values).toEqual(WANT)
        expect.soft(reader2.values).toEqual(WANT)
    })
})

describe('shareReplay', () => {
    afterEach(() => {
        vi.useRealTimers()
    })

    test('late subscriber gets previous value', { timeout: 500 }, async () => {
        vi.useFakeTimers()
        let called = 0
        const observable = new Observable(observer => {
            called++
            ;(async () => {
                await new Promise(resolve => setTimeout(resolve, 10))
                observer.next('a')
                await new Promise(resolve => setTimeout(resolve, 10))
                observer.next('b')
                observer.complete()
            })()
        }).pipe(shareReplay())

        const reader1 = readValuesFrom(observable)
        await vi.advanceTimersByTimeAsync(10)
        const reader2 = readValuesFrom(observable)
        await vi.runAllTimersAsync()
        reader1.unsubscribe()
        reader2.unsubscribe()
        await reader1.done
        await reader2.done

        const WANT: typeof reader1.values = ['a', 'b']
        expect.soft(reader1.values).toEqual(WANT)
        expect.soft(reader2.values).toEqual(WANT) // reader2 got the previous value
        expect(called).toBe(1) // but the observable was only heated up once
    })
})

describe('switchMap', () => {
    test('switches to new inner observable when source emits', async () => {
        vi.useFakeTimers()
        const source = new Subject<string>()
        const result = source.pipe(switchMap(c => observableOfTimedSequence(10, `${c}-1`, 10, `${c}-2`)))
        const { values, done } = readValuesFrom(result)

        source.next('a')
        await vi.advanceTimersByTimeAsync(15)
        expect(values).toEqual<typeof values>(['a-1'])
        values.length = 0

        source.next('b')
        await vi.advanceTimersByTimeAsync(15)
        expect(values).toEqual<typeof values>(['b-1'])
        values.length = 0

        await vi.advanceTimersByTimeAsync(10)
        expect(values).toEqual<typeof values>(['b-2'])
        values.length = 0

        source.complete()
        await done
        expect(values).toEqual<typeof values>([])
    })

    test('unsubscribes from previous inner observable', async () => {
        vi.useFakeTimers()
        const innerSubject1 = new Subject<string>()
        const innerSubject2 = new Subject<string>()
        const source = new Subject<number>()
        const result = source.pipe(switchMap(x => (x === 1 ? innerSubject1 : innerSubject2)))
        const { values, done } = readValuesFrom(result)

        source.next(1)
        innerSubject1.next('a')
        expect(values).toEqual(['a'])

        source.next(2)
        innerSubject1.next('b') // This should be ignored
        innerSubject2.next('c')
        expect(values).toEqual(['a', 'c'])

        source.complete()
        innerSubject2.complete()
        await done
        expect(values).toEqual(['a', 'c'])
    })

    test('handles errors from source observable', async () => {
        vi.useFakeTimers()
        const source = new Subject<number>()
        const result = source.pipe(switchMap(x => observableOfSequence(x * 10)))
        const { values, done } = readValuesFrom(result)

        source.next(1)
        await vi.advanceTimersByTimeAsync(10)
        source.next(2)
        await vi.advanceTimersByTimeAsync(10)
        source.error(new Error('Source error'))

        await expect(done).rejects.toThrow('Source error')
        expect(values).toEqual([10, 20])
    })

    test('handles errors from inner observable', async () => {
        vi.useFakeTimers()
        const source = new Subject<number>()
        const result = source.pipe(
            switchMap(x => {
                if (x === 2) {
                    return new Observable(observer => observer.error(new Error('Inner error')))
                }
                return observableOfSequence(x * 10)
            }),
        )
        const { values, done } = readValuesFrom(result)
        done.catch(() => {})

        source.next(1)
        await vi.advanceTimersByTimeAsync(10)
        source.next(2)
        await vi.advanceTimersByTimeAsync(10)

        await expect(done).rejects.toThrow('Inner error')
        expect(values).toEqual([10])
    })

    test('completes when source completes and last inner observable completes', async () => {
        vi.useFakeTimers()
        const source = new Subject<string>()
        const result = source.pipe(switchMap(c => observableOfTimedSequence(10, `${c}-1`, 10, `${c}-2`)))
        const { values, done } = readValuesFrom(result)

        source.next('a')
        await vi.advanceTimersByTimeAsync(20)
        source.complete()

        await done
        expect(values).toEqual(['a-1', 'a-2'])
    })
})
