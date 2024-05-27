import http from 'http'
import url from 'url'
import dedent from 'dedent'
import open from 'open'
import destroyer from 'server-destroy'

export interface LinearAuthClientConfig {
    client_id: string
    client_secret: string
    redirect_uris: string[]
}

export interface UserCredentials {
    access_token: string
}

const port = process.env.PORT ? Number(process.env.PORT) : 3000
const serverURL = `http://localhost:${port}`

export const SCOPES = ['read']

export function createAccessToken(config: LinearAuthClientConfig): Promise<string> {
    return new Promise((resolve, reject) => {
        const [redirectUri] = config.redirect_uris

        const server = http
            .createServer(async (req, res) => {
                try {
                    if (req.url!.includes('/oauth2callback')) {
                        const qs = new url.URL(req.url!, serverURL).searchParams
                        const code = qs.get('code')
                        if (!code) {
                            throw new Error('code is not found!')
                        }
                        const params = new URLSearchParams({
                            code,
                            grant_type: 'authorization_code',
                            redirect_uri: redirectUri,
                            client_id: config.client_id,
                            client_secret: config.client_secret,
                        })

                        // Exchange `code` for an access token
                        // https://developers.linear.app/docs/oauth/authentication#id-4.-exchange-code-for-an-access-token
                        const tokenResponse = await fetch('https://api.linear.app/oauth/token', {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/x-www-form-urlencoded',
                            },
                            body: params.toString(),
                        })

                        const tokenData = await tokenResponse.json()

                        if (tokenData.access_token) {
                            res.end(dedent`
                                Add the following to the Linear provider config and reload VS Code:

                                "https://openctx.org/npm/@openctx/provider-linear": {
                                    "linearClientCredentials": {
                                      "accessToken": "${tokenData.access_token}"
                                    },
                                }
                            `)

                            resolve(tokenData.access_token)
                        } else {
                            res.end(dedent`
                                Authorization failed. Please try again by reloading the VS Code window.
                            `)

                            reject(new Error('Failed to retrieve access token'))
                        }

                        server.destroy()
                    }
                } catch (e) {
                    reject(e)
                }
            })
            .listen(port, () => {
                //  Redirect user access requests to Linear
                // https://developers.linear.app/docs/oauth/authentication#id-2.-redirect-user-access-requests-to-linear
                const authorizeURL = new url.URL('https://linear.app/oauth/authorize')
                authorizeURL.searchParams.set('response_type', 'code')
                authorizeURL.searchParams.set('client_id', config.client_id)
                authorizeURL.searchParams.set('redirect_uri', redirectUri)
                authorizeURL.searchParams.set('scope', SCOPES.join(' '))

                open(authorizeURL.toString(), { wait: false }).then(cp => cp.unref())
            })

        destroyer(server)
    })
}
