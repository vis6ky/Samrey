---
name: samrey-project-creation
description: Scaffold, configure, and initialize production Samrey applications using the CLI and starter templates.
---

# Samrey Project Creation & Scaffolding

## Purpose
Guides the creation of new Samrey web projects with correct dependency graphs, Vite plugins, and production starter templates.

## When to Use
- Initializing a new greenfield Samrey project.
- Setting up build tools (Vite, TypeScript, Tailwind CSS).
- Choosing the right starter template (`ssr`, `spa`, `minimal`, `ssg`).

## Relevant CLI Commands
```bash
# Create an SSR application (recommended for full-stack apps)
npx @samrey/cli create my-app --template ssr

# Create a Single-Page Application (SPA)
npx @samrey/cli create my-spa --template spa

# Initialize AI developer instructions and MCP configs
cd my-app
npx @samrey/cli ai init
```

## Project File Layout
```
my-app/
├── src/
│   ├── components/      # Reusable UI components
│   ├── routes/          # Application views & router config
│   ├── stores/          # Reactive domain stores
│   ├── App.ts           # Root application shell
│   └── main.ts          # Client entrypoint
├── server.ts            # Node.js SSR server (for ssr template)
├── vite.config.ts       # Vite build config with Samrey compiler plugin
├── package.json
└── tsconfig.json
```

## Validation Instructions
Run `npm run build` and `npm test` inside the project directory to confirm zero build errors.
