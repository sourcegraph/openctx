# Context7 context provider for OpenCtx

[OpenCtx](https://openctx.org) context provider for bringing Context7 repository documentation into code AI and editors.

## Usage

Configure your OpenCtx client:

```json
"openctx.providers": {
    // ...other providers...
    "https://raw.githubusercontent.com/sato-ke/openctx/refs/heads/feat/context7/provider/context7/dist/bundle.js": {
        "tokens": 6000,         // Maximum number of tokens to return (required)
        "mentionLimit": 3       // (Optional) Maximum number of libraries per request (default: 5, max: 20)
    }
}
```

### How to use in your editor

This provider supports navigation mode for AI-assisted library discovery:

1. **Navigation Mode** (get library listing):
   - `@context7 <library query>` - Shows navigation with all matching libraries
   - Example: `@context7 react`

2. **Direct Library Access** (after seeing navigation):
   - `@context7 <library query> <page numbers>` - Access specific libraries by number
   - Examples:
     - `@context7 react 1` - Get library #1
     - `@context7 react 1/3/5` - Get libraries #1, #3, and #5
     - `@context7 react 2/4 authentication` - Get libraries #2 and #4 with authentication topic filter

## Features

- **Navigation Mode**: Browse available libraries with detailed information
- **Page Number Selection**: AI can directly access specific libraries using numbers from navigation
- **Topic Filtering**: Optional topic keyword to filter documentation content

## Context included

Repository documentation:
- Library navigation with ID, description, token count, and trust score
- Full documentation content for selected libraries
- Topic-filtered content when topic keyword is specified
- Content formatted as plain text for AI consumption

## Configuration

- `tokens` — Maximum number of tokens to return (required). Example: `6000`.
- `mentionLimit` — (Optional) Maximum number of libraries that can be selected at once (default: 3, max: 20).

## How it works

1. **Navigation Request**: When you type `@context7 <query>`, the provider searches for matching libraries and returns a navigation menu
2. **Library Selection**: AI can then request specific libraries using the numbers shown in navigation
3. **Content Fetching**: Selected libraries' documentation is fetched with optional topic filtering
4. **Token Limiting**: Content is limited to the configured token count to fit within AI context limits

## Recommended VS Code Settings

To optimize AI interaction with context7 provider, add this to your `settings.json`:

```json
{
  "cody.chat.preInstruction": "### context7 provider usage\n`@context7 <library query>` - Get library navigation to see available libraries and their numbers\n`@context7 <library query> [page numbers]` - Get specific libraries using numbers from navigation (e.g., 1/3/5)\n`@context7 <library query> [page numbers] [topic]` - Get specific libraries with topic filter (e.g., 1/3 authentication)\n\n#### Important notes:\n- Page numbers are only available after seeing navigation first\n- For deep research: (1) get navigation, (2) identify relevant libraries, (3) fetch specific libraries by number\n- Topic filter helps narrow down documentation to specific areas"
}
```

**Key points for AI behavior**:
- Always start with navigation (`@context7 <query>`) to understand available libraries
- Page numbers are provider-generated and only visible in navigation responses
- Use specific page numbers for targeted documentation retrieval
- Apply topic filters when focusing on specific aspects of the library

## Development

- License: Apache 2.0
