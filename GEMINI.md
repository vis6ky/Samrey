# Google Gemini & Gemini CLI Instructions — Samrey Framework (GEMINI.md)

> **Role**: Guidance tailored for Google Gemini models (Gemini 1.5 Pro, Gemini 2.0 Flash, Gemini CLI, Google AI Studio, and Antigravity) developing applications in Samrey.

---

## 1. Single Source of Truth
Gemini must treat [AGENTS.md](AGENTS.md) and the [ai/](ai/) canonical specification directory as the authoritative reference:
- [ai/SPEC.md](ai/SPEC.md): Core framework contracts & zero-VDOM invariants
- [ai/ARCHITECTURE.md](ai/ARCHITECTURE.md): System architecture & execution lifecycle
- [ai/API_CONTRACTS.md](ai/API_CONTRACTS.md): Verified public APIs across all 13 `@samrey/*` packages
- [ai/COMPONENT_RULES.md](ai/COMPONENT_RULES.md): Component construction, template hoisting, and surgical bindings
- [ai/ERROR_REFERENCE.md](ai/ERROR_REFERENCE.md): Diagnostic codes `SAMREY-101` to `SAMREY-501`

---

## 2. Gemini-Specific Execution & Prompt Optimizations

### Context Caching & Rule Precedence
- When working in large multi-turn sessions, rely on the cached rules in `ai/*.md`.
- Never invent speculative APIs or assume React conventions. Samrey components execute **EXACTLY ONCE** on instantiation.

### Tool Use & CLI Execution
When executing shell operations via Antigravity or Gemini CLI:
- Run non-destructive verification: `npx @samrey/cli check --json`
- Inspect errors: `npx @samrey/cli explain <error-code> --json`
- Run test suites: `npx @samrey/cli test`
- Build for production: `npx @samrey/cli build`

### Structured Generation Format
When generating components for the user, emit:
1. Static hoisted template (`template('<... ref="id" ...>')`).
2. Component factory function accepting typed `props`.
3. Surgical bindings (`bindText`, `bindAttr`, `on`).
4. Companion test file using `@samrey/testing` (`renderTest`, `fireEvent`, `flushReactivity`).

---

## 3. Strict Prohibitions
- ❌ **NEVER import React, Vue, or Angular libraries**.
- ❌ **NEVER use React hooks** (`useState`, `useEffect`, etc.).
- ❌ **NEVER mutate signal arrays or objects in-place** (`todos.value.push(x)`).
- ❌ **NEVER write `<Show>` or `<For>` as template HTML tags**.
- ❌ **NEVER call signals as functions** (`count()`).
