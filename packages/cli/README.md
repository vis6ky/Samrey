# @samrey/cli

Command Line Interface, project scaffolder, Vite compiler plugin, and static auditor for Samrey projects.

## Purpose

`@samrey/cli` provides tooling to initialize, develop, build, and audit Samrey applications. It includes scaffolding templates (`minimal`, `spa`, `ssr`, `ssg`), the official Vite plugin for template compilation, and security/accessibility code auditing commands.

## Installation

```bash
# Global CLI
npm install -g @samrey/cli

# Or create a new project via npx / npm create
npm create samrey@latest my-app
```

## Quick Example

```bash
# 1. Create a new application
npx @samrey/cli create my-app --template spa

# 2. Start development server
cd my-app
npm run dev

# 3. Build for production
npm run build

# 4. Audit codebase for security and a11y
npx @samrey/cli audit
```

```ts
// vite.config.ts
import { defineConfig } from 'vite';
import { samreyPlugin } from '@samrey/cli';

export default defineConfig({
  plugins: [samreyPlugin()]
});
```

## API / Commands

- `samrey create <name> [--template <type>]` — Scaffolds a new project (`minimal`, `spa`, `ssr`, `ssg`).
- `samrey dev [--port <number>] [--host]` — Starts the local dev server.
- `samrey build [--outDir <path>] [--ssr]` — Compiles and bundles the application using the project's installed Vite (`vite build`) and reports real disk file and gzip sizes.
- `samrey preview [--port <number>] [--host] [--outDir <path>]` — Serves existing build output using the project's Vite preview (`vite preview`).
- `samrey test [--watch] [--coverage]` — Executes application test suites directly using Vitest (if installed) or Node.js test runner (`node:test`).
- `samrey audit [--warn-only]` — Runs lightweight static checks on source files (`<img>` alt attributes, `javascript:` URIs, inline `on*` handlers, `<script>` tags). *Note:* this is a small static check, not a full security audit.
- `samrey analyze [--json] [--outDir <path>]` — Measures and reports real build artifact raw and gzip file sizes from the output directory.
- `samreyPlugin(options?: SamreyPluginOptions)` — Vite plugin performing AOT compilation and template transforms.

## Environment

Node.js (>= 18.0.0), npm (>= 8.0.0), or pnpm / yarn / bun.

## Security

Scaffolds projects with strict Content Security Policy headers, sanitized entry points, and zero-eval compilation pipelines.

## Related Packages

- `@samrey/compiler` — Underlying compiler engine used by the Vite plugin.
- `@samrey/runtime` — Target runtime package included in scaffolded projects.

