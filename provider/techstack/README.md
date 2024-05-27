# Tech Stack File context provider for OpenCtx

This is a context provider for [OpenCtx](https://openctx.org) that annotates your code with metadata such as package category and package homepage urls provided by a corresponding `techstack.yml` file.

## Example

![OpenCtx Techstack provider in action](./examples/demo.gif)

## Usage

Provide the absolute file path of the techstack yml file in the settings.

```json
"openctx.providers": {
    // ... other providers ...
    "https://openctx.org/npm/@openctx/provider-techstack": {
        "yaml": "</full/path/to/techstack.yml>"
    }
}
```

## Notes

- The Tech Stack File provider for [OpenCtx](https://openctx.org) currently provides annotations for `.js(x)` and `.ts(x)` files.

    ```typescript
    capabilities(params: CapabilitiesParams, settings: Settings): CapabilitiesResult {
        // TODO: support more languages
        return { selector: [{ path: '**/*.js?(x)' }, { path: '**/*.ts?(x)' }] }
    },
    ```

- Tech Stack File provider annotates packages detected in your project's `package.json` against CommonJS and ES Module import statements in your code.
