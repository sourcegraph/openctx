import { distinctUntilChanged } from '@openctx/client/observable'
import { Observable } from 'observable-fns'
import { debugTap } from './debug.js'

/**
 * An Observable that emits when the page's URL changes.
 */
export const locationChanges = new Observable<URL>(observer => {
    const emitCurrentLocation = (): void => {
        observer.next(new URL(window.location.href))
    }

    const onLinkClick = (ev: MouseEvent): void => {
        if (!(ev.target instanceof HTMLAnchorElement && ev.target.href)) {
            return
        }
        setTimeout(emitCurrentLocation)
    }

    // Listen for clicks on <a> elements, which likely cause an immediate location change.
    document.addEventListener('click', onLinkClick)

    // Listen for popstate events, which also indicate an immediate location change.
    window.addEventListener('popstate', emitCurrentLocation)

    // Poll to detect any other location changes.
    const intervalHandle = setInterval(emitCurrentLocation, 5000)

    emitCurrentLocation()

    return () => {
        document.removeEventListener('click', onLinkClick)
        window.removeEventListener('popstate', emitCurrentLocation)
        clearInterval(intervalHandle)
    }
}).pipe(
    distinctUntilChanged((a, b) => a.toString() === b.toString()),
    debugTap(url => console.log('locationChanges', url.toString())),
)
