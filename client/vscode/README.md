# OpenCodeGraph for VS Code

<!-- Published to https://marketplace.visualstudio.com/items?itemName=sourcegraph.opencodegraph -->

Contextual info about code from your dev tools, in your editor. See [opencodegraph.org](https://opencodegraph.org).

![Screenshot of OpenCodeGraph annotations for Storybook in a code file](https://storage.googleapis.com/sourcegraph-assets/blog/screencast-vscode-storybook-v0.gif)

_Hover over a UI component in code to see what it looks like_

## Usage

_Status: alpha_

<!-- Keep in sync with web/content/docs/start.mdx -->

<!-- prettier-ignore -->
1. Install [OpenCodeGraph for VS Code](https://marketplace.visualstudio.com/items?itemName=sourcegraph.opencodegraph) (`sourcegraph.opencodegraph`).
1. Add the following to your VS Code settings:
      ```json
      "opencodegraph.providers": {
          "https://opencodegraph.org/npm/@opencodegraph/provider-hello-world": true,
      },
      ```
1. Open a code file and look for the "Hello World" annotations from OpenCodeGraph.
1. Add other OpenCodeGraph providers to see more contextual info about your code:
   - [Links](https://opencodegraph.org/docs/providers/links)
   - [Storybook](https://opencodegraph.org/docs/providers/storybook)
   - [Prometheus](https://opencodegraph.org/docs/providers/prometheus)
   - For more and to write your own, see "[OpenCodeGraph docs](https://opencodegraph.org/docs/start)".
1. _(Optional)_ Add Sourcegraph as an OpenCodeGraph provider in VS Code to get the same annotations in your editor as you get in Sourcegraph:

    ```json
    "opencodegraph.providers": {
        // ...other providers...
        "https://sourcegraph.com/.api/opencodegraph": true,
    },
    ```

## Development

- [Source code](https://sourcegraph.com/github.com/sourcegraph/opencodegraph/-/tree/client/vscode)
- [Docs](https://opencodegraph.org/docs/clients/vscode)
- License: Apache 2.0
