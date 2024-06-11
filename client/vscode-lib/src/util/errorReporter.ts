import type { ProviderMethodOptions } from '@openctx/client'
import { type Observable, type UnaryFunction, catchError, of, pipe, tap } from 'rxjs'
import * as vscode from 'vscode'
import type { ErrorWaiter } from './errorWaiter.js'

const MIN_TIME_SINCE_LAST_ERROR = 1000 * 60 * 15 /* 15 min */

interface PromiseErrorHook {
    opts: ProviderMethodOptions
    onfinally: () => void
}

interface ErrorReporter {
    tapAndCatch: UnaryFunction<any, any>
    /**
     * Returns opts with errorHook set so we report swallowed errors. This
     * should be used on observables.
     *
     * The client will swallow errors so aggregation works. This calls the
     * same functions our observable error catchers would also call.
     */
    withObserveOpts: (opts?: ProviderMethodOptions) => ProviderMethodOptions
    /**
     * Returns opts with errorHook set so we report swallowed errors.
     * Additionally returns an onfinally function to be used on the promise.
     *
     * The client will swallow errors so aggregation works. This calls the
     * same functions our observable error catchers would also call.
     */
    withPromiseOpts: (opts?: ProviderMethodOptions) => PromiseErrorHook
}

export function createErrorReporter(
    outputChannel: vscode.OutputChannel,
    errorWaiter: ErrorWaiter,
    errorNotificationMessage: string
): ErrorReporter {
    const errorTapObserver = {
        next(): void {
            errorWaiter.gotError(false)
        },
        error(): void {
            // Show an error notification unless we've recently shown one (to avoid annoying
            // the user).
            const shouldNotify = errorWaiter.timeSinceLastError() > MIN_TIME_SINCE_LAST_ERROR
            if (shouldNotify) {
                showErrorNotification(outputChannel, errorNotificationMessage)
            }

            errorWaiter.gotError(true)
        },
    }
    const errorCatcher = <T = any>(error: any): Observable<T[]> => {
        outputChannel.appendLine(error)
        return of([])
    }

    return {
        tapAndCatch: pipe(tap(errorTapObserver), catchError(errorCatcher)),
        withObserveOpts: (opts?: ProviderMethodOptions): ProviderMethodOptions => {
            // TODO(keegan) because we swallow errors observers errorTapObserver
            // will always mark success.
            return withErrorHook(opts, (_providerUri, err) => {
                errorCatcher(err)
                errorTapObserver.error()
            })
        },
        withPromiseOpts: (opts?: ProviderMethodOptions): PromiseErrorHook => {
            // For promises we aggregate the errors for a single call and when
            // the promise is complete we update errorTapObserver with success
            // or failure. This is to prevent spamming errors if multiple
            // providers have issues.
            const errors: any[] = []
            return {
                opts: withErrorHook(opts, (_providerUri, err) => {
                    errorCatcher(err)
                    errorTapObserver.error()
                }),
                onfinally: () => {
                    if (errors.length === 0) {
                        errorTapObserver.next()
                        return
                    }

                    const err = errors.length === 1 ? errors[0] : new AggregateError(errors)
                    errorCatcher(err)
                    errorTapObserver.error()
                },
            }
        },
    }
}

function withErrorHook(
    opts: ProviderMethodOptions | undefined,
    errorHook: (providerUri: string, err: any) => void
): ProviderMethodOptions {
    const parent = opts?.errorHook
    return {
        ...opts,
        errorHook: (providerUri, err) => {
            if (parent) {
                parent(providerUri, err)
            }
            errorHook(providerUri, err)
        },
    }
}

function showErrorNotification(outputChannel: vscode.OutputChannel, errorMessage: string): void {
    const OPEN_LOG = 'Open Log'
    vscode.window
        .showErrorMessage(errorMessage, {
            title: OPEN_LOG,
        } satisfies vscode.MessageItem)
        .then(action => {
            if (action?.title === OPEN_LOG) {
                outputChannel.show()
            }
        })
}
