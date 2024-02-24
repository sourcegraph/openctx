# Configurable links context provider for OpenCtx

This is a context provider for [OpenCtx](https://openctx.org) that annotates your code with links based on configurable patterns.

## Example

![Screenshot of OpenCtx docs link items in a GitHub PR](https://storage.googleapis.com/sourcegraph-assets/openctx/screenshot-github-links-browser-v0-0.5x.png)

_Show relevant internal docs in GitHub PRs_

![Screenshot of OpenCtx docs link items in a code file](https://storage.googleapis.com/sourcegraph-assets/openctx/screenshot-vscode-links-v1.png)

_Add links (in VS Code) to internal CSS guidelines to files using CSS_

Visit the [OpenCtx playground](https://openctx.org/playground) for live examples.

## Usage

Add the following to your settings in any OpenCtx client:

```json
"openctx.providers": {
    // ...other providers...
    "https://openctx.org/npm/@openctx/provider-links": {
        "links": [
            // Link to docs next to every literal match of `eventLogger.log` in *.ts files.
            {
                "title": "Event logging tips",
                "url": "https://example.com/event-logging-docs",
                "type": "docs",
                "preview": true,
                "path": "**/*.ts",
                "pattern": "eventLogger\\.log"
            },

            // Link to a PostgreSQL console for the specific table being queried in a code file.
            {
                "title": "🐘 $<table> table (PostgreSQL console)",
                "url": "https://example.com/postgresql?table=$<table|queryEscape>",
                "description": "View table schema and data...",
                "path": "**",
                "pattern": "(FROM|UPDATE|INSERT INTO|DELETE FROM|ALTER TABLE) (?<table>\\w+)"
            },

            // Link TODO(person) comments to that person's profile page in your internal employee directory.
            {
                "title": "Contact $<person>",
                "url": "https://example.com/people?q=$<person|queryEscape>",
                "path": "**",
                "pattern": "TODO((?<person>\\w+))"
            }
        ]
    }
},
```

See "[Configuration](#configuration)" for documentation on configuring link patterns and presentation details.

Tips:

- If you're using VS Code, you can put the snippet above in `.vscode/settings.json` in the repository or workspace root to configure per-repository links.
- Play around with the links provider in realtime on the [OpenCtx playground](https://openctx.org/playground).

## Configuration

<!-- Keep in sync with index.ts -->

```typescript
/** Settings for the links OpenCtx provider. */
interface Settings {
  links?: LinkPattern[]
}

interface LinkPattern {
  /** Title of the link. */
  title: string

  /** URL of the link. */
  url: string

  /** A description of the link's destination. Markdown is supported. */
  description?: string

  /** The type of link (if applicable), which may affect the appearance. */
  type?: 'docs'

  /** Glob pattern matching the file URIs to annotate. */
  path: string

  /**
   * Regexp pattern matching the locations in a file to annotate. If undefined, it adds the link
   * to the top of the file.
   *
   * The pattern may contain capture groups. The values of matched capture groups can be used in
   * the `title`, `url`, and `description` fields by using:
   *
   * - $n for the nth capture group
   * - $<name> for the named capture group with the given name
   * - $<name|queryEscape> for the value of encodeURIComponent($<name>), for the `url` field
   *
   * For example, if a LinkPattern has a title `Hello, $1` and a pattern `(alice|bob)`, then the
   * title returned to the client would be `Hello, alice` for every occurrence of `alice` in the
   * text, and likewise `Hello, bob` for every occurrence of `bob`.
   */
  pattern?: string
}
```

## Development

- [Source code](https://sourcegraph.com/github.com/sourcegraph/openctx/-/tree/provider/links)
- [Docs](https://openctx.org/docs/providers/links)
- License: Apache 2.0
