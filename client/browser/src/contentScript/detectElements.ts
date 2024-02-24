import { Observable, map } from 'rxjs'

/**
 * Return an Observable that emits the first DOM element that matches the given selector. If none is
 * found, nothing is emitted. Polls briefly in case the page is still loading.
 */
export function withDOMElement<E extends Element>(selectors: string): Observable<E> {
    return withDOMElements<E>(selectors).pipe(map(els => els[0]))
}

/**
 * Return an Observable that emits all DOM elements matching the given selector. If none is
 * found, nothing is emitted. Polls briefly in case the page is still loading.
 */
export function withDOMElements<E extends Element>(selectors: string): Observable<E[]> {
    return new Observable(observer => {
        const els = document.querySelectorAll<E>(selectors)
        if (els.length > 0) {
            observer.next(Array.from(els))
        } else {
            let calls = 0
            const MAX_CALLS = 10
            const intervalHandle = setInterval(() => {
                const els = document.querySelectorAll<E>(selectors)
                if (els.length !== 0) {
                    observer.next(Array.from(els))
                }

                calls++
                if (els.length > 0 || calls >= MAX_CALLS) {
                    clearInterval(intervalHandle)
                }
            }, 250)
            observer.add(() => clearInterval(intervalHandle))
        }
    })
}
