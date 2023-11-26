import { tap } from 'rxjs'

/**
 * Additional debug logging.
 */
export const DEBUG = true

/**
 * Like RxJS's {@link tap}, but only run if {@link DEBUG} is true.
 */
export const debugTap: typeof tap = DEBUG ? tap : () => source => source
