# @gati/cli

Command Line Interface, project scaffolder, Vite compiler plugin, and static auditor for Gati projects.

## Purpose

`@gati/cli` provides tooling to initialize, develop, build, and audit Gati applications. It includes scaffolding templates (`minimal`, `spa`, `ssr`, `ssg`), the official Vite plugin for template compilation, and security/accessibility code auditing commands.

## Installation

```bash
# Global CLI
npm install -g @gati/cli

# Or create a new project via npx / npm create
npm create aether@latest my-app
```

## Quick Example

```bash
# 1. Create a new application
npx @gati/cli create my-app --template spa

# 2. Start development server
cd my-app
npm run dev

# 3. Build for production
npm run build

# 4. Audit codebase for security and a11y
npx @gati/cli audit
```

```ts
// vite.config.ts
import { defineConfig } from 'vite';
import { aetherPlugin } from '@gati/cli';

export default defineConfig({
  plugins: [aetherPlugin()]
});
```

## API / Commands

- `aether create <name> [--template <type>]` — Scaffolds a new project (`minimal`, `spa`, `ssr`, `ssg`).
- `aether build` — Builds the application for production.
- `aether audit` — Performs static security and accessibility validation across all source templates.
- `aetherPlugin(options?: GatiPluginOptions)` — Vite plugin performing AOT compilation and JSX transforms.
- `scaffold(targetDir: string, template: TemplateType): Promise<void>` — Programmatic scaffolding API.

## Environment

Node.js (>= 18.0.0), npm (>= 8.0.0), or pnpm / yarn / bun.

## Security

Scaffolds projects with strict Content Security Policy headers, sanitized entry points, and zero-eval compilation pipelines.

## Related Packages

- `@gati/compiler` — Underlying compiler engine used by the Vite plugin.
- `@gati/runtime` — Target runtime package included in scaffolded projects.

