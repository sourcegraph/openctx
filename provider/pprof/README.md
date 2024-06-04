# [pprof](https://github.com/google/pprof) context provider for OpenCtx

This is a context provider for [OpenCtx](https://openctx.org) that annotates functions with the CPU time and memory allocations attributed to them.

## Usage

Add the following to your settings in any OpenCtx client:

```json
"openctx.providers": {
    // ...other providers...
    "https://openctx.org/npm/@openctx/provider-pprof": true
},
```

## Configuration

> TODO

## Development

- [Source code](https://sourcegraph.com/github.com/sourcegraph/openctx/-/tree/provider/pprof)
- [Docs](https://openctx.org/docs/providers/pprof)
- License: Apache 2.0
