# Google Docs context provider for OpenCtx

This is a context provider for [OpenCtx](https://openctx.org) that brings Google Docs context to code AI and editors.

**Status:** experimental

## Configuration

To create Google Drive/Docs API credentials:

1. Enable the following services in your Google Cloud project: `gcloud services enable drive.googleapis.com docs.googleapis.com`
1. [Configure the OAuth consent screen](https://console.cloud.google.com/apis/credentials/consent) (only a name and email addresses are required)
1. [Create a new OAuth client ID](https://console.cloud.google.com/apis/credentials/oauthclient) (select "Desktop app" as the application type)
1. Save the credentials JSON file (`client_secret_xxx.apps.googleusercontent.json`)
1. Obtain an access token for your Google Drive user account: run `GOOGLE_OAUTH_CLIENT_FILE=path/to/client_secret_xxx.apps.googleusercontent.json pnpm run google-auth` and continue in your web browser
1. Save the printed JSON user credentials of the form `{"access_token": "xxx"}` to a file

Then use the following OpenCtx provider configuration:

```json
"openctx.providers": {
    // ...other providers...
    "https://openctx.org/npm/@openctx/provider-google-docs": {
        "googleOAuthClientFile": "path/to/client_secret_xxx.apps.googleusercontent.json",
        "googleOAuthCredentialsFile": "path/to/user-credentials.json"
    }
},
```


## Development

- [Source code](https://sourcegraph.com/github.com/sourcegraph/openctx/-/tree/provider/google-docs)
- [Docs](https://openctx.org/docs/providers/google-docs)
- License: Apache 2.0
