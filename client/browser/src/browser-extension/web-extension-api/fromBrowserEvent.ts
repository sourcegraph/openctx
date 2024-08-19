import { Observable } from 'observable-fns'

/**
 * Returns an Observable for a WebExtension API event listener.
 * The handler will always return `void`.
 */
export const fromBrowserEvent = <F extends (...args: any[]) => void>(
    emitter: browser.CallbackEventEmitter<F>,
): Observable<Parameters<F>> =>
    new Observable(observer => {
        const handler: any = (...args: any) => observer.next(args)
        try {
            emitter.addListener(handler)
        } catch (error) {
            observer.error(error)
            return undefined
        }
        return () => emitter.removeListener(handler)
    })
