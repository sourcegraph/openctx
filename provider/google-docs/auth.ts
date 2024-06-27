import http from 'http'
import type { AddressInfo } from 'net'
import { readFileSync } from 'node:fs'
import url from 'node:url'
import dedent from 'dedent'
import { OAuth2Client } from 'google-auth-library'
import open from 'open'
import destroyer from 'server-destroy'

const keys: { installed: { client_id: string; client_secret: string; redirect_uris: string[] } } =
    JSON.parse(readFileSync(process.env.GOOGLE_OAUTH_CLIENT_FILE!, 'utf8'))

const SCOPES = [
    'https://www.googleapis.com/auth/drive.readonly',
    'https://www.googleapis.com/auth/documents.readonly',
]

export function getAuthenticatedClient(): Promise<OAuth2Client> {
    return new Promise<OAuth2Client>((resolve, reject) => {
        let serverURL: string | undefined = undefined

        const server = http
            .createServer(async (req, res) => {
                try {
                    if (req.url!.indexOf('/oauth2callback') > -1) {
                        const qs = new url.URL(req.url!, serverURL).searchParams
                        const code = qs.get('code')

                        if (!code) {
                            res.end('Authentication successful. Please return to the console.')
                            reject('Authentication failed.')
                            return
                        }

                        const r = await oauthClient.getToken(code)

                        res.end(dedent`
                          Authentication successful. Update your provider settings:

                          "https://openctx.org/npm/@openctx/provider-google-docs": {
                              "googleOAuthClient": {
                                  "client_id": "${keys.installed.client_id}",
                                  "client_secret": "${keys.installed.client_secret}",
                                  "redirect_uris": ["${keys.installed.redirect_uris[0]}"]
                              },
                              "googleOAuthCredentials": {
                                  "refresh_token": "${r.tokens.refresh_token}",
                                  "access_token": "${r.tokens.access_token}",
                                  "expiry_date": "${r.tokens.expiry_date}",
                              }
                          }
                        `)

                        server.destroy()

                        oauthClient.setCredentials(r.tokens)
                        resolve(oauthClient)
                    }
                } catch (e) {
                    reject(e)
                }
            })
            .listen(0, () => {
                console.log('opening ' + authorizeURL)
                open(authorizeURL, { wait: false }).then(cp => cp.unref())
            })
        destroyer(server)

        serverURL = `http://localhost:${(server.address() as AddressInfo).port}`

        const oauthClient = new OAuth2Client({
            clientId: keys.installed.client_id,
            clientSecret: keys.installed.client_secret,
            redirectUri: `${serverURL}/oauth2callback`,
        })

        const authorizeURL = oauthClient.generateAuthUrl({
            access_type: 'offline',
            scope: SCOPES.join(' '),
        })
    })
}

const client = await getAuthenticatedClient()
const accessToken = await client.getAccessToken()
console.log({ access_token: accessToken.token })
