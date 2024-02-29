# Google Docs context provider for OpenCtx

This is a context provider for [OpenCtx](https://openctx.org) that brings Google Docs context to code AI and editors.

**Status:** experimental

## Configuration

To create a Google Drive/Docs API key:

1. Enable the services in your Google Cloud project: `gcloud services enable drive.googleapis.com docs.googleapis.com`
1. Visit the following URL in your browser, replacing `CLIENT_ID` with the client ID of a Google Cloud OAuth2 client: `https://accounts.google.com/o/oauth2/auth?scope=https://www.googleapis.com/auth/drive.readonly%20https://www.googleapis.com/auth/documents.readonly&response_type=code&access_type=offline&redirect_uri=http://localhost&client_id=CLIENT_ID`
1. Authorize the application in your browser. Your browser will be redirected to `http://localhost`, which will (most likely) fail, but you should see a `code` in the URL.
1. Get your access token, replacing `CODE`, `CLIENT_ID`, and `CLIENT_SECRET` with the actual values: `curl -d 'code=CODE&client_id=CLIENT_ID&client_secret=CLIENT_SECRET&redirect_uri=http://localhost&grant_type=authorization_code' https://oauth2.googleapis.com/token`


## Development

- [Source code](https://sourcegraph.com/github.com/sourcegraph/openctx/-/tree/provider/google-docs)
- [Docs](https://openctx.org/docs/providers/google-docs)
- License: Apache 2.0
