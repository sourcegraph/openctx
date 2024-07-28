// Identical to provider/linear-docs/auth.ts.
// Keep the duplicate for now to keep things simple.
import { readFileSync, writeFileSync } from 'node:fs'
import http from 'node:http'
import path from 'node:path'
import url, { fileURLToPath } from 'node:url'
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

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const DEFAULT_USER_CREDENTIALS_PATH = path.resolve(__dirname, 'linear_user_credentials.json')
const DEFAULT_CLIENT_CONFIG_PATH = path.join(__dirname, 'linear_client_config.json')

const clientConfigPath = process.env.LINEAR_OAUTH_CLIENT_FILE || DEFAULT_CLIENT_CONFIG_PATH
const userCredentialsPath = process.env.LINEAR_USER_CREDENTIALS_FILE || DEFAULT_USER_CREDENTIALS_PATH

const port = process.env.PORT ? Number(process.env.PORT) : 3000
const serverURL = `http://localhost:${port}`

export const SCOPES = ['read']

export function createAccessToken(clientConfig?: LinearAuthClientConfig): Promise<string> {
    return new Promise((resolve, reject) => {
        const config =
            clientConfig ||
            (JSON.parse(readFileSync(clientConfigPath, 'utf8')) as LinearAuthClientConfig)

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
                        res.end('Authentication successful. Please return to the console.')
                        server.destroy()

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

                        const tokenData = (await tokenResponse.json()) as { access_token?: string }

                        if (tokenData.access_token) {
                            resolve(tokenData.access_token)
                        } else {
                            reject(new Error('Failed to retrieve access token'))
                        }
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

async function main() {
    const accessToken = await createAccessToken()
    console.log(`Got access token: ${accessToken}`)

    const userCredentials = JSON.stringify({ access_token: accessToken } satisfies UserCredentials)
    writeFileSync(userCredentialsPath, userCredentials, {
        encoding: 'utf8',
    })

    console.log(`Saved access token to ${userCredentialsPath}`)
}

main()
