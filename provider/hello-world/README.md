# Hello World context provider for OpenCodeGraph

This is a sample context provider for [OpenCodeGraph](https://opencodegraph.org) that annotates every file with `✨ Hello, world!` every 10 lines or so.

## Usage

Add the following to your settings in any OpenCodeGraph client:

```json
"opencodegraph.providers": {
    // ...other providers...
    "https://opencodegraph.org/npm/@opencodegraph/provider-hello-world": true
},
```

## Configuration

This sample provider is not configurable.

## Development

- [Source code](https://sourcegraph.com/github.com/sourcegraph/opencodegraph/-/tree/provider/hello-world)
- [Docs](https://opencodegraph.org/docs/providers/hello-world)
- License: Apache 2.0
