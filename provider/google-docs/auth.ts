import { readFileSync } from 'fs'
import http from 'http'
import type { AddressInfo } from 'net'
import url from 'url'
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
                        res.end('Authentication successful. Please return to the console.')
                        server.destroy()

                        const r = await oauthClient.getToken(code!)
                        oauthClient.setCredentials(r.tokens!)
                        resolve(oauthClient)
                    }
                } catch (e) {
                    reject(e)
                }
            })
            .listen(0, () => {
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
