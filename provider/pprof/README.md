# [pprof](https://github.com/google/pprof) context provider for OpenCtx

[OpenCtx](https://openctx.org) provider that annotates Go functions with their associated CPU time and memory allocations based on the CPU/memory profiles.

As profiling reports are usually not stored in a centralized remote location (like, e.g. docs or logs) and only exist on your machine, this provider only supports local VSCode client. It also does not provide annotations for test files.

When enabled, pprof provider will:

1. Search the workspace to find a profiling report and, optionally, a Go binary that produced it.
1. Get `pprof -top` nodes for the current package.
1. Create an annotation for each function/method in the current file denoting its resourse consumption.
1. Pass a detailed `pprof -list` breakdown to `annotation.item.ai` to be consumed by Cody.

## Usage

Add the following to your `settings.json`:

```json
"openctx.providers": {
    // ...other providers...
    "https://openctx.org/npm/@openctx/provider-pprof": true
},
```

Pprof provider has reasonable defaults, so no additional configuration in necessary if you follow the standard naming conventions for pprof reports and Go binaries, e.g. that a cpu profile report has `.pprof` extension.

Most of the time, however, you'll want to adjust the config to suit your preferences.

## Configuration

The default configuration looks like this:

```json
{
    "reportGlob": "**/*.pprof",
    "binaryGlob": undefined, // By default, looks for a binary whose name matches the name of its parent directory
    "rootDirectoryMarkers": ["go.mod", ".git"],
    "top": { // Options to control `pprof -top` output
        "excludeInline": true, // Add `-noinlines`
        "nodeCount": undefined, // Add `-nodecount=x`, not set by default
        "sort": "cum" // Set `-cum` or `-flat`
    }
}
```

## Limitations

`pprof` can collect stack traces for a number of [different profiles](https://pkg.go.dev/runtime/pprof#Profile):

```
goroutine    - stack traces of all current goroutines
heap         - a sampling of memory allocations of live objects
allocs       - a sampling of all past memory allocations
threadcreate - stack traces that led to the creation of new OS threads
block        - stack traces that led to blocking on synchronization primitives
mutex        - stack traces of holders of contended mutexes
```

This provider only supports `heap` and CPU profile[^1].

## Development

- [Source code](https://sourcegraph.com/github.com/sourcegraph/openctx/-/tree/provider/pprof)
- [Docs](https://openctx.org/docs/providers/pprof)
- License: Apache 2.0

____

[^1]: The CPU profile is not available as a `runtime/pprof.Profile` and has a special API.
