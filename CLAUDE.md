# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

OpenCtx is an open standard for annotating code with contextual information from various development tools. It's a TypeScript monorepo using pnpm workspaces.

## Build Commands

```bash
# Install dependencies (use correct pnpm version)
npm install -g pnpm@8.6.7
pnpm i

# Build everything
pnpm build       # Runs prebuild then TypeScript compilation
pnpm bundle      # Builds and bundles all packages

# Development
pnpm watch       # TypeScript watch mode
pnpm generate    # Run code generation

# Code quality
pnpm check       # Run linting (Biome + Stylelint)
pnpm biome       # Format and lint with auto-fix

# Testing
pnpm test                # Run all tests
pnpm test:unit          # Run unit tests once
pnpm test:integration   # Run VS Code integration tests
pnpm test <pattern>     # Run specific test files
```

## Architecture

### Monorepo Structure
- **lib/** - Core libraries
  - `client` - Client library for consuming OpenCtx
  - `protocol` - Protocol type definitions
  - `provider` - Base provider implementation
  - `schema` - JSON Schema definitions
- **client/** - Platform-specific client implementations (VS Code, browser, CodeMirror, Monaco)
- **provider/** - OpenCtx providers (GitHub, Storybook, Prometheus, etc.)
- **web/** - Documentation website (openctx.org)

### Provider Pattern
Providers implement the standard interface:
```typescript
interface Provider {
    meta(params: MetaParams, settings: S): MetaResult
    mentions?(params: MentionsParams, settings: S): Promise<MentionsResult>
    items?(params: ItemsParams, settings: S): Promise<ItemsResult>
    annotations?(params: AnnotationsParams, settings: S): Promise<AnnotationsResult>
}
```

### Development Workflow for Providers
1. Create provider in `provider/<name>/`
2. Must include: `index.ts`, `package.json`, `tsconfig.json`
3. Export default provider implementation
4. Bundle format: ESM for distribution
5. Settings validation should happen in provider methods

### TypeScript Configuration
- Uses project references for efficient builds
- Strict mode enabled with all checks
- Target: ESNext, Module: NodeNext
- Each package extends `tsconfig.base.json`

### Code Style
- Formatter: Biome with 4-space indentation
- Line width: 105 characters
- Single quotes, semicolons as needed
- Trailing commas enabled

### Testing
- Framework: Vitest
- Test files: `*.test.ts` or in `test/` directories
- Each package can have its own `vitest.config.ts`
- Run specific test: `pnpm test path/to/test.ts`

### Common Development Tasks

When working on providers:
1. Navigation mode: Use `isNavigation` flag in mention data
2. Page numbering: Parse with `PATTERNS.PAGE_NUMBERS` regex
3. Error handling: Use `createErrorItem()` for user-friendly errors
4. Caching: Use `QuickLRU` for API responses
5. Debouncing: Implement for search/mention operations

When working on client integrations:
1. Use `@openctx/client` for standardized client behavior
2. Implement platform-specific UI in client packages
3. Follow existing patterns in similar client implementations