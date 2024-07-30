import { Observable, Subscription, type Unsubscribable } from 'rxjs'
import { isBackground } from '../../shared/env.js'
import type { BackgroundApi } from './types.js'

interface RequestMessage {
    /**
     * If defined, this request is expecting an Observable (multiple emitted values) in response.
     * The streamId is a unique and opaque identifier that all responses will be associated with so
     * that the caller can associate them with this request.
     *
     * If `undefined`, the request is expecting a Promise (single emitted value), and no stream is
     * needed.
     */
    streamId?: string

    /**
     * The name of the method to invoke.
     */
    method: string

    /**
     * The method arguments.
     */
    args: unknown[]
}

interface ResponseMessage {
    /**
     * If defined, this response is an emitted value (or error/completion event) from a request that
     * expects an Observable (multiple emitted values). All responses to that request use the same
     * `streamId` as the request so they can be associated with it.
     *
     * If `undefined`, this response is a single value.
     */
    streamId?: string

    streamEvent?: 'next' | 'error' | 'complete'

    /**
     * For non-stream responses or for `next`/`error` stream events, the data.
     */
    data?: unknown
}

// This function generates a unique ID for each message stream.
function generateStreamId(): string {
    return Math.random().toString(36).slice(2) + Date.now().toString(36)
}

// This function sends a message and returns an Observable that will emit the responses
function callBackgroundMethodReturningObservable(method: string, args: unknown[]): Observable<unknown> {
    const streamId = generateStreamId()
    const request: RequestMessage = { streamId, method, args }

    return new Observable<unknown>(observer => {
        // Set up a listener for messages from the background.
        const messageListener = (response: ResponseMessage): void => {
            // If the message is on the stream for this call, emit it.
            if (response.streamId === streamId) {
                switch (response.streamEvent) {
                    case 'next':
                        observer.next(response.data)
                        break
                    case 'error':
                        observer.error(response.data)
                        break
                    case 'complete':
                        observer.complete()
                        break
                }
            }
        }

        chrome.runtime.onMessage.addListener(messageListener)

        chrome.runtime.sendMessage(request).catch(console.error)

        return () => {
            chrome.runtime.onMessage.removeListener(messageListener)
        }
    })
}

/**
 * Create a proxy for an Observable-returning background API method.
 */
export function proxyBackgroundMethodReturningObservable<M extends keyof BackgroundApi>(
    method: M,
): BackgroundApi[M] {
    if (isBackground) {
        throw new Error(
            'tried to call background service worker function from background service worker itself',
        )
    }
    return (...args: any[]) =>
        callBackgroundMethodReturningObservable(method, args) as ReturnType<BackgroundApi[M]>
}

/**
 * Set up the background service worker to handle API requests from the content script.
 */
export function addMessageListenersForBackgroundApi(api: BackgroundApi): Unsubscribable {
    if (!isBackground) {
        throw new Error('must be called from background')
    }

    const subscriptions = new Subscription()

    const handler = (
        { streamId, method, args }: RequestMessage,
        sender: browser.runtime.MessageSender,
    ): Promise<void> => {
        if (streamId === undefined) {
            throw new Error('non-Observable-returning RPC calls are not yet implemented')
        }

        const handler = api[method as keyof BackgroundApi]
        if (!handler) {
            throw new Error(`Invalid RPC call for method ${JSON.stringify(method)}`)
        }

        const senderTabId = sender.tab?.id
        if (!senderTabId) {
            throw new Error('no sender tab ID')
        }

        const subscription = handler.apply(api, args as any).subscribe({
            next: value => {
                browser.tabs
                    .sendMessage(senderTabId, { streamId, streamEvent: 'next', data: value })
                    .catch(console.error)
            },
            error: error => {
                browser.tabs
                    .sendMessage(senderTabId, { streamId, streamEvent: 'error', data: error.toString() })
                    .catch(console.error)
                if (subscription) {
                    subscriptions.remove(subscription)
                }
            },
            complete: () => {
                browser.tabs
                    .sendMessage(senderTabId, { streamId, streamEvent: 'complete' })
                    .catch(console.error)
                if (subscription) {
                    subscriptions.remove(subscription)
                }
            },
        })
        subscriptions.add(subscription)
        return Promise.resolve()
    }

    browser.runtime.onMessage.addListener(handler)

    subscriptions.add(() => browser.runtime.onMessage.removeListener(handler))

    return subscriptions
}
