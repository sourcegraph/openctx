# Postgres context provider for OpenCtx

This is a context provider for [OpenCtx](https://openctx.org) that brings context from your Postgres DB to code AI and editors. Postgres context provider allows to add details about a specific schema from your Postgres Database.

**Status:** Experimental

## Configuration

```json
"openctx.providers": {
    // ...other providers...
    "https://openctx.org/npm/@openctx/provider-postgres": {
      "DB_URL": "<Database URL>"
    }
},
```

## Development

- [Source code](https://sourcegraph.com/github.com/sourcegraph/openctx/-/tree/provider/postgres)
- [Docs](https://openctx.org/docs/providers/postgres)
- License: Apache 2.0
