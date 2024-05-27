import { readFileSync, writeFileSync } from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { LinearClient } from '@linear/sdk'
import {
    type LinearAuthClientConfig,
    type UserCredentials,
    createAccessToken,
} from './create-access-token.js'

async function main() {
    const __filename = fileURLToPath(import.meta.url)
    const __dirname = path.dirname(__filename)

    const DEFAULT_USER_CREDENTIALS_PATH = path.resolve(__dirname, 'linear_user_credentials.json')
    const DEFAULT_CLIENT_CONFIG_PATH = path.join(__dirname, 'linear_client_config.json')

    const clientConfigPath = process.env.LINEAR_OAUTH_CLIENT_FILE || DEFAULT_CLIENT_CONFIG_PATH
    const userCredentialsPath = process.env.LINEAR_USER_CREDENTIALS_FILE || DEFAULT_USER_CREDENTIALS_PATH
    const clientConfig = JSON.parse(readFileSync(clientConfigPath, 'utf8')) as LinearAuthClientConfig

    const accessToken = await createAccessToken(clientConfig)
    const client = new LinearClient({ accessToken })
    console.log(`Got access token: ${accessToken}`)

    await client.issueSearch({ query: 'test' })
    const userCredentials = JSON.stringify({ access_token: accessToken } satisfies UserCredentials)
    writeFileSync(userCredentialsPath, userCredentials, {
        encoding: 'utf8',
    })

    console.log(`Saved access token to ${userCredentialsPath}`)
}

main()
