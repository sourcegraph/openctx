import type * as vscode from 'vscode'

interface ErrorWaiter extends vscode.Disposable {
    ok(): boolean
    timeSinceLastError(): number
    gotError(isError: boolean): void
}

/**
 * Create an object that can be used by another function to pause operations after consecutive
 * errors have occurred.
 */
export function createErrorWaiter(delay: number, errorCountThreshold: number): ErrorWaiter {
    let errorCount = 0
    let lastErrorAt = 0
    let timeoutHandle: ReturnType<typeof setTimeout> | undefined

    return {
        ok(): boolean {
            return errorCount < errorCountThreshold
        },
        timeSinceLastError(): number {
            return Date.now() - lastErrorAt
        },
        gotError(isError: boolean): void {
            if (!isError) {
                errorCount = 0
                return
            }

            errorCount++
            lastErrorAt = Date.now()
            if (errorCount === errorCountThreshold) {
                console.log(
                    'Got many errors, waiting',
                    delay,
                    'ms before retrying.',
                    errorCount,
                    errorCountThreshold
                )
                if (timeoutHandle === undefined) {
                    timeoutHandle = setTimeout(() => {
                        errorCount = 0
                        timeoutHandle = undefined
                    }, delay)
                }
            }
        },
        dispose(): void {
            if (!timeoutHandle) {
                return
            }
            if ('unref' in timeoutHandle) {
                timeoutHandle.unref()
            } else if (typeof timeoutHandle === 'number') {
                clearTimeout(timeoutHandle)
            }
        },
    }
}
