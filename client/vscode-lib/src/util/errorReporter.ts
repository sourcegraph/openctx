import type { ProviderMethodOptions } from '@openctx/client'
import { catchError, tap } from '@openctx/client/observable'
import { Observable } from 'observable-fns'
import type * as vscode from 'vscode'
import { type ErrorWaiter, createErrorWaiter } from './errorWaiter.js'

const MIN_TIME_SINCE_LAST_ERROR = 1000 * 60 * 15 /* 15 min */

/**
 * The users action affects our behaviour around reporting, so we explicitly
 * tell ErrorReporter the intent.
 */
export enum UserAction {
    /**
     * Implicit actions will not report if an error has recently been shown.
     * If they error a lot we will skip the operation.
     */
    Implicit = 0,
    /**
     * Explicit actions will always report if an error happens.
     */
    Explicit = 1,
}

/**
 * ErrorReporterController contains state and logic for how we report errors. We
 * want to report errors per providerUri as well as avoid spamming the user with
 * errors.
 */
export class ErrorReporterController implements vscode.Disposable {
    private errorWaiters = new Map<string, ErrorWaiter>()
    private errorNotificationVisible = new Set<string>()

    constructor(
        private showErrorNotification: (providerUri: string | undefined, error: any) => Thenable<any>,
        private errorLog: (error: any) => void,
    ) {}

    /**
     * wraps providerMethod to ensure it reports errors to the user.
     */
    public wrapObservable<T, R>(
        userAction: UserAction,
        providerMethod: (params: T, opts?: ProviderMethodOptions) => Observable<R>,
    ) {
        return (params: T, opts?: ProviderMethodOptions) => {
            const errorReporter = this.getErrorReporter(userAction, opts)
            if (errorReporter.skip) {
                return Observable.of([])
            }

            const tapper = () => {
                errorReporter.onValue(undefined)
                errorReporter.report()
            }
            const errorCatcher = <T = any>(error: any): Observable<T[]> => {
                errorReporter.onError(undefined, error)
                errorReporter.report()
                return Observable.of([])
            }

            opts = withErrorHook(opts, (providerUri, error) => {
                errorReporter.onError(providerUri, error)
                errorReporter.report()
            })

            return providerMethod(params, opts).pipe(tap(tapper), catchError(errorCatcher))
        }
    }

    /**
     * wraps providerMethod to ensure it reports errors to the user.
     */
    public wrapPromise<T, R>(
        userAction: UserAction,
        providerMethod: (params: T, opts?: ProviderMethodOptions) => Promise<R>,
    ) {
        return async (params: T, opts?: ProviderMethodOptions) => {
            const errorReporter = this.getErrorReporter(userAction, opts)
            if (errorReporter.skip) {
                return []
            }
            opts = withErrorHook(opts, (providerUri, error) => {
                errorReporter.onError(providerUri, error)
            })
            return providerMethod(params, opts).finally(() => errorReporter.report())
        }
    }

    /**
     * getErrorReporter implements the core reporting state that is shared
     * between errorHook, promise and observables. It takes cares to:
     *
     * - Aggregate errors to only report once
     * - Associate errors with a specific providerUri
     * - Decide if a notification should be shown.
     */
    private getErrorReporter(userAction: UserAction, opts?: ProviderMethodOptions) {
        // If we are unsure of which providerUri to associate a report with,
        // we use this URI.
        const defaultProviderUri = opts?.providerUri ?? ''

        // We can have multiple providers fail in a call, so we store the
        // errors per provider to correctly report back to the user.
        const errorByUri = new Map<string, any[]>()

        // onValue is called when we have succeeded
        const onValue = (providerUri: string | undefined) => {
            providerUri = providerUri ?? defaultProviderUri
            // If we get a value signal we had no errors for this providerUri
            errorByUri.set(providerUri, [])
        }

        // onError is called each time we see an error.
        const onError = (providerUri: string | undefined, error: any) => {
            // Append to errors for this providerUri
            providerUri = providerUri ?? defaultProviderUri
            const errors = errorByUri.get(providerUri) ?? []
            errors.push(error)
            errorByUri.set(providerUri, errors)

            // Always log the error.
            this.errorLog(error)
        }

        // report takes the seen errors so far and decides if they should be
        // reported.
        const report = () => {
            // We may not have reported a value or error for
            // defaultProviderUri, so add an empty list so we clear it out.
            if (!errorByUri.has(defaultProviderUri)) {
                errorByUri.set(defaultProviderUri, [])
            }

            for (const [providerUri, errors] of errorByUri.entries()) {
                const hasError = errors.length > 0

                const errorWaiter = this.getErrorWaiter(providerUri)
                errorWaiter.gotError(hasError)

                // From here on out it is about notifying for an error
                if (!hasError) {
                    continue
                }

                // Show an error notification unless we've recently shown one
                // (to avoid annoying the user).
                const shouldNotify =
                    userAction === UserAction.Explicit ||
                    errorWaiter.timeSinceLastError() > MIN_TIME_SINCE_LAST_ERROR
                if (shouldNotify) {
                    const error = errors.length === 1 ? errors[0] : new AggregateError(errors)
                    this.maybeShowErrorNotification(providerUri, error)
                }
            }

            // Clear out seen errors so that report may be called again.
            // This is necessary for observables.
            errorByUri.clear()
        }

        return {
            skip: userAction === UserAction.Implicit && !this.getErrorWaiter(defaultProviderUri).ok(),
            onValue,
            onError,
            report,
        }
    }

    private getErrorWaiter(providerUri: string): ErrorWaiter {
        let errorWaiter = this.errorWaiters.get(providerUri)
        if (errorWaiter) {
            return errorWaiter
        }

        // Pause for 10 seconds if we get 5 errors in a row.
        const errorDelay = 10 * 1000
        const errorThreshold = 5
        errorWaiter = createErrorWaiter(errorDelay, errorThreshold)
        this.errorWaiters.set(providerUri, errorWaiter)
        return errorWaiter
    }

    private maybeShowErrorNotification(providerUri: string, error: any) {
        // We store the notification thenable so we can tell if the last
        // notification for providerUri is still showing.
        if (this.errorNotificationVisible.has(providerUri)) {
            return
        }
        this.errorNotificationVisible.add(providerUri)
        const onfinally = () => this.errorNotificationVisible.delete(providerUri)

        // If providerUri is the empty string communicate that via undefined
        this.showErrorNotification(providerUri === '' ? undefined : providerUri, error).then(
            onfinally,
            onfinally,
        )
    }

    public dispose() {
        for (const errorWaiter of this.errorWaiters.values()) {
            errorWaiter.dispose()
        }
        this.errorWaiters.clear()
    }
}

function withErrorHook(
    opts: ProviderMethodOptions | undefined,
    errorHook: (providerUri: string, err: any) => void,
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
