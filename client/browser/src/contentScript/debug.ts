import { tap } from '@openctx/client/observable'
import { Observable, type ObservableLike } from 'observable-fns'

/**
 * Additional debug logging.
 */
export const DEBUG = true

/**
 * Like the standard Observable {@link tap}, but only run if {@link DEBUG} is true.
 */
export const debugTap: typeof tap = DEBUG
    ? tap
    : () =>
          (source: ObservableLike<any>): Observable<any> =>
              Observable.from(source)
