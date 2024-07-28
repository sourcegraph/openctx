import { type Client, type ClientConfiguration, type Range, createClient } from '@openctx/client'
import { useMemo } from 'react'

let promptedForAuthInfo = false // don't prompt too many times

export function useOpenCtxClient(settings: string): Client<Range> {
    const client = useMemo(
        () =>
            createClient({
                configuration: async () =>
                    Promise.resolve({
                        enable: true,
                        providers: JSON.parse(settings)[
                            'openctx.providers'
                        ] as ClientConfiguration['providers'],
                    }),
                authInfo: async provider => {
                    const hostname = new URL(provider).hostname
                    if (hostname === 'sourcegraph.test') {
                        const STORAGE_KEY = 'sourcegraphTestAccessToken'
                        let token = localStorage.getItem(STORAGE_KEY)
                        if (token === null && !promptedForAuthInfo) {
                            promptedForAuthInfo = true
                            token = prompt('Enter an access token for https://sourcegraph.test:3443.')
                            if (token === null) {
                                throw new Error('No access token provided')
                            }
                            localStorage.setItem(STORAGE_KEY, token)
                        }
                        if (token !== null) {
                            return { headers: { Authorization: `token ${token}` } }
                        }
                    }
                    return null
                },
                makeRange: r => r,
                logger: console.error,
            }),
        [settings],
    )
    return client
}
