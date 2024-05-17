import { Observable, distinctUntilChanged } from 'rxjs'
import { debugTap } from './debug.js'

/**
 * An Observable that emits when the page's URL changes.
 */
export const locationChanges: Observable<URL> = new Observable<URL>(observer => {
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
    observer.add(() => document.removeEventListener('click', onLinkClick))

    // Listen for popstate events, which also indicate an immediate location change.
    window.addEventListener('popstate', emitCurrentLocation)
    observer.add(() => window.removeEventListener('popstate', emitCurrentLocation))

    // Poll to detect any other location changes.
    const intervalHandle = setInterval(emitCurrentLocation, 5000)
    observer.add(() => clearInterval(intervalHandle))

    emitCurrentLocation()
}).pipe(
    distinctUntilChanged((a, b) => a.toString() === b.toString()),
    debugTap(url => console.log('locationChanges', url.toString()))
)
