# Samrey Framework — AI-Agent Readiness Report & Architecture Guide

**Version:** 2.1.0  
**Status:** Official Framework Guide  
**Target Assistants:** OpenAI ChatGPT / Codex, Anthropic Claude / Claude Code, Google Gemini / Gemini CLI, xAI Grok, GitHub Copilot, Cursor, and MCP-compatible coding agents.

---

## 1. Executive Summary

Samrey is an independent, compile-time fine-grained reactive web framework engineered with **Zero Virtual DOM**, static template hoisting (`template("...")`), and surgical DOM updating (`bindText`, `bindAttr`, `on`).

Through this evolution, Samrey has achieved full **AI-Agent-Native** readiness. Autonomous coding agents and LLMs can now independently understand, architect, generate, test, debug, and maintain full-scale production applications in Samrey without hallucinations, reverse-engineering internal compiler source code, or inventing speculative APIs.

---

## 2. The Single Source of Truth Hierarchy

To eliminate instruction drift and foreign framework confusion, Samrey establishes a strict canonical documentation hierarchy:

```
AGENTS.md (Universal Master Root)
  ├── ai/SPEC.md                     (Core framework contracts & philosophy)
  ├── ai/ARCHITECTURE.md             (Zero-VDOM lifecycle & execution model)
  ├── ai/API_CONTRACTS.md            (Verified TypeScript public API contracts)
  ├── ai/REACTIVITY_RULES.md         (Signals, computeds, effects, stores, owners)
  ├── ai/COMPONENT_RULES.md          (Static templates, .refs, surgical bindings)
  ├── ai/COMPILER_RULES.md           (AIR pipeline, hoisting, security/a11y)
  ├── ai/ROUTING_RULES.md            (Client router, outlets, links, guards)
  ├── ai/SSR_RULES.md                (Streaming HTML, pre-hydration script, hydration)
  ├── ai/SECURITY_RULES.md           (Contextual sanitizers, Trusted Types, CSRF)
  ├── ai/TESTING_RULES.md            (Headless test harness & assertions)
  ├── ai/ERROR_REFERENCE.md          (Catalog of SAMREY-101 to SAMREY-501)
  ├── ai/EXAMPLES_INDEX.md           (Verified production code examples catalog)
  ├── ai/VERSION_COMPATIBILITY.md    (SemVer & runtime support matrix)
  └── skills/                        (12 portable Markdown agent skills)
```

### Vendor Integration Guides
- **`CLAUDE.md`**: Specialized for Anthropic Claude & Claude Code CLI. Documents MCP tool usage, context optimization, and subagent delegation.
- **`GEMINI.md`**: Specialized for Google Gemini (Gemini 1.5 Pro, 2.0 Flash, Gemini CLI, AI Studio). Focuses on CLI execution, tool schemas, and structured prompt generation.
- **`.github/copilot-instructions.md`**: Specialized for GitHub Copilot inline autocompletion and template generation.
- **`.cursor/rules/samrey.mdc`**: Specialized for Cursor AI rules.

---

## 3. The 12 Universal AI Skills

Portable, vendor-neutral skills are installed in both `ai/skills/` and `skills/`, each structured with 8 mandatory sections:
1. `samrey-core`: Zero-VDOM invariants, static hoisting, and project scaffolding.
2. `samrey-reactivity`: Fine-grained signals, computed derivation, effects, stores, and memory cleanup.
3. `samrey-components`: Template cloning with references (`root.refs`), surgical bindings, and function-based control flow (`Show`, `For`).
4. `samrey-compiler`: AOT parser, intermediate representation (AIR), security/a11y passes, and diagnostic resolution.
5. `samrey-routing`: Client-side routing with `RouterOutlet`, `Link`, dynamic parameters, and auth guards.
6. `samrey-forms`: Standard Schema validation, ARIA accessibility, input binding, and submission deduplication.
7. `samrey-ssr`: Node.js server rendering (`renderToString`, `renderToStream`), pre-hydration script, and client `hydrate()`.
8. `samrey-security`: Contextual HTML/URL/CSS sanitization, W3C Trusted Types, anti-CSRF tokens, and secret redaction.
9. `samrey-testing`: Headless DOM testing (`renderTest`, `fireEvent`, `flushReactivity`).
10. `samrey-debugging`: Troubleshooting `SAMREY-101` through `SAMREY-501` errors and reactivity loops.
11. `samrey-performance`: High-frequency batching, static template hoisting, and memory hygiene.
12. `samrey-migration`: Translating components and hooks from React, Vue, Solid, and Svelte into native Samrey.

---

## 4. Enhanced Model Context Protocol (MCP) Server

The `@samrey/mcp-server` package exposes 27 tools over JSON-RPC stdio. 

### Key AI-Agent Operations:
| Tool Name | Output Format | Description |
| :--- | :--- | :--- |
| `samrey_get_project_context` | Structured JSON | Full workspace inspection: version, dependencies, entrypoints, components, routes, and health score. |
| `samrey_get_architecture` | Structured JSON | Authoritative architectural rules, execution invariants, and compilation pipelines. |
| `samrey_get_api_contracts` | Structured JSON | Verified TypeScript public API signatures across all 13 `@samrey/*` packages. |
| `samrey_generate_component` | Structured JSON | Generates component with template references (`.refs`), validation report, and companion unit test. |
| `samrey_generate_feature` | Structured JSON | Generates full vertical slice: component, reactive store, route snippet, and unit tests. |
| `samrey_validate_project` | Structured JSON | Deeply scans project source code for compiler diagnostics, foreign hooks, and anti-patterns. |
| `samrey_fix_diagnostics` | Structured JSON | Automatically applies deterministic AST and regex code repairs for compiler diagnostics. |
| `samrey_check_accessibility`| Structured JSON | Scans templates for missing alt text, missing form labels, invalid ARIA attributes, and button types. |
| `samrey_check_security` | Structured JSON | Scans code for dangerous URI schemes, unescaped HTML, hardcoded secrets, and missing CSRF verification. |
| `samrey_verify_application` | Structured JSON | Performs an end-to-end multi-dimensional quality audit returning a weighted 0-100 score. |

### Security Boundaries
- **Path Traversal Defense**: All read and write operations are strictly validated against project boundaries via `resolveSafePath` with symlink traversal checks.
- **Secret Redaction**: Environment variables, authentication tokens, and private keys are scrubbed from outputs using `redactSecrets`.
- **Command Whitelisting**: Process execution is restricted to safe subcommands of `npm`, `node`, and `git`. Destructive operations require explicit authorization (`SAMREY_MCP_ALLOW_EXEC=1`).

---

## 5. Structured Compiler Diagnostics

The compiler error system in `@samrey/compiler` (`SamreyCompilerError`) emits structured diagnostic contracts:
- **`code`**: Unique identifier (`SAMREY-101` to `SAMREY-501`).
- **`severity`**: `'error'` | `'warning'` | `'info'`.
- **`line` & `column`**: Precise source location.
- **`sourceFrame`**: Highlighted code snippet with error pointer (`^`).
- **`explanation`**: Human- and machine-readable explanation.
- **`rootCause`**: The deterministic underlying cause.
- **`suggestion`**: Actionable guidance.
- **`documentationLink`**: Verified link to canonical documentation.
- **`quickFix`**: Machine-applicable code patch (where determinable).
- **`.toJSON()`**: Direct structured export for MCP tools and AI agents.

---

## 6. Official Reference Applications

Three complete, fully tested reference applications validate real Samrey capabilities:
1. **SaaS Administration Dashboard (`benchmarks/fixtures/saas-dashboard/`)**:
   - Layout with real-time metrics cards and reactive activity feed.
   - Live search filter by subscriber name and action.
   - Demonstrates: `@samrey/reactivity`, `@samrey/runtime`, `@samrey/testing`.
2. **E-Commerce Storefront (`benchmarks/fixtures/ecommerce-store/`)**:
   - Product catalog with category filter tabs.
   - Interactive cart drawer with item quantity increments, removals, and subtotal calculation with `computed()`.
   - Demonstrates: `computed`, `For`, `Show`, `@samrey/testing`.
3. **Enterprise CRM & Analytics (`benchmarks/fixtures/crm-app/`)**:
   - Customer pipeline management across deal stages (`Lead`, `Negotiation`, `Won`, `Lost`).
   - Customer creation form validated via `@samrey/forms` with field error indicators.
   - Live deal value analytics and win rate percentage calculations.
   - Demonstrates: `@samrey/forms`, `@samrey/reactivity`, `@samrey/runtime`, `@samrey/testing`.

---

## 7. Developer Tooling & CLI Enhancements

The `@samrey/cli` package provides agent-friendly subcommands with universal `--json` support:
- `samrey create <name> --template ssr|spa`: Scaffolds production starter apps.
- `samrey check [--json]`: Fast non-destructive syntax and idiom verification.
- `samrey doctor [--json]`: Diagnoses environment, Node version, dependencies, and configuration.
- `samrey explain <code-or-error> [--json]`: Explains diagnostic error codes with causes and code solutions.
- `samrey audit [--security] [--a11y] [--json]`: Static security and accessibility linter.
- `samrey test`: Runs unit and integration test suites.
- `samrey build`: Production compiler via Vite.
- `samrey dev`: Local development server with HMR.
