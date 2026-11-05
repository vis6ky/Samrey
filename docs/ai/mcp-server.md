# Samrey Model Context Protocol (MCP) Server

`@samrey/mcp-server` implements the Model Context Protocol (spec v2024-11-05), exposing live framework knowledge, code generation, real-time compilation, and diagnostic tools to any MCP-compliant client.

## Installation & Running

### Stdio Mode (Default)
Run directly with `npx`:

```bash
npx @samrey/mcp-server
```

Or via Samrey CLI:

```bash
npx @samrey/cli ai mcp
```

---

## 18 Native MCP Tools

### Documentation Tools
- `samrey_search_docs`: Keyword search across all official package documentation and error guides.
- `samrey_get_documentation`: Fetch complete documentation chapter for any topic.
- `samrey_get_api_reference`: Retrieve exact signature, parameters, return type, and example for an API.
- `samrey_get_examples`: Fetch verified production code examples by domain.
- `samrey_get_best_practices`: Fetch official do's and don'ts, anti-patterns, and architectural rules.

### Project Inspection Tools
- `samrey_analyze_project`: Scan project components, routes, configs, and architectural health score.
- `samrey_detect_version`: Identify installed Samrey version and feature flags (SSR, Routing, Forms, etc.).
- `samrey_detect_packages`: List all official `@samrey/*` packages installed in the project.
- `samrey_inspect_structure`: Inspect directory layout, entry files, and configuration files.

### Development Tools
- `samrey_init_project`: Scaffold AI instruction files and skills into current workspace.
- `samrey_generate_component`: Generate a new native component file with static template and signals.
- `samrey_generate_page`: Generate page view component.
- `samrey_generate_route`: Generate router configuration entry.

### Validation & Diagnostics
- `samrey_validate_code`: Compile and AST-lint code snippet or file using `@samrey/compiler`.
- `samrey_check_compatibility`: Execute 13-task automated compatibility suite.
- `samrey_run_tests`: Run project test runner in controlled sandbox.
- `samrey_build_project`: Execute production Vite build.
- `samrey_diagnose_errors`: Diagnose compiler or runtime error codes (`SAMREY-101`..`SAMREY-108`) with automated fix suggestions.

---

## 8 MCP Resources (`samrey://*`)

- `samrey://docs/overview`: Architectural invariants and zero-VDOM model.
- `samrey://docs/api`: Complete JSON API registry.
- `samrey://docs/components`: Component creation and DOM binding guide.
- `samrey://docs/reactivity`: Reactive signals and store guide.
- `samrey://docs/routing`: Client-side routing guide.
- `samrey://docs/ssr`: Server-Side Rendering and streaming guide.
- `samrey://examples`: Full JSON repository of verified code examples.
- `samrey://project/structure`: Live context of current workspace files and packages.

---

## 7 MCP Prompts

- `create-samrey-project`: Initializing a new production app.
- `build-samrey-component`: Authoring an idiomatic component.
- `build-samrey-dashboard`: Building a complete SaaS dashboard.
- `implement-samrey-routing`: Setting up client routes.
- `implement-samrey-reactivity`: Modeling complex reactive state.
- `debug-samrey-project`: Diagnosing compiler or runtime errors.
- `optimize-samrey-application`: Fine-tuning template hoisting and bundle size.

