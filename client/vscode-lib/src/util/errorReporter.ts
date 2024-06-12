import type { ProviderMethodOptions } from '@openctx/client'
import { type Observable, type UnaryFunction, catchError, of, pipe, tap } from 'rxjs'
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
 * What is returned from both getForObservable and getForPromise.
 */
interface ErrorReporterCommon {
    /** true if we should "disable" this action due to too many errors. */
    skipIfImplicitAction: boolean
    /**
     * opts that should be passed onto the provider. Will be the original opts
     * with an errorHook set.
     */
    opts: ProviderMethodOptions
}

interface ErrorReporterObservable extends ErrorReporterCommon {
    tapAndCatch: UnaryFunction<any, any>
}

interface ErrorReporterPromise extends ErrorReporterCommon {
    onfinally: () => void
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
        private errorLog: (error: any) => void
    ) {}

    /**
     * returns an opts with an errorHook aswell as tapAndCatch to pipe your
     * observable into.
     */
    public getForObservable(
        userAction: UserAction,
        opts?: ProviderMethodOptions
    ): ErrorReporterObservable {
        const errorReporter = this.getErrorReporter(userAction, opts)
        const tapper = () => {
            errorReporter.onValue(undefined)
            errorReporter.report()
        }
        const errorCatcher = <T = any>(error: any): Observable<T[]> => {
            errorReporter.onError(undefined, error)
            errorReporter.report()
            return of([])
        }
        return {
            skipIfImplicitAction: errorReporter.skipIfImplicitAction,
            tapAndCatch: pipe(tap(tapper), catchError(errorCatcher)),
            opts: withErrorHook(opts, (providerUri, error) => {
                errorReporter.onError(providerUri, error)
                errorReporter.report()
            }),
        }
    }

    /**
     * returns an opts with an errorHook aswell as onfinally function to use
     * with the promise you return.
     */
    public getForPromise(userAction: UserAction, opts?: ProviderMethodOptions): ErrorReporterPromise {
        const errorReporter = this.getErrorReporter(userAction, opts)
        return {
            skipIfImplicitAction: errorReporter.skipIfImplicitAction,
            onfinally: () => {
                errorReporter.report()
            },
            opts: withErrorHook(opts, (providerUri, error) => {
                errorReporter.onError(providerUri, error)
            }),
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
            skipIfImplicitAction: !this.getErrorWaiter(defaultProviderUri).ok(),
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
            onfinally
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
