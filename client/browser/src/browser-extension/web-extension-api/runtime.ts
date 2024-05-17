import { proxyBackgroundMethodReturningObservable } from './rpc.js'
import type { BackgroundApi } from './types.js'

/**
 * Functions invoked from content scripts that will be executed in the background service worker.
 */
export const background: BackgroundApi = {
    annotationsChanges: proxyBackgroundMethodReturningObservable('annotationsChanges'),
}
