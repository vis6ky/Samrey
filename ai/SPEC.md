# Samrey Framework — Canonical AI Specification (SPEC.md)

**Version:** 2.1.0  
**Status:** Living Canonical Specification  
**Authority:** Single Source of Truth for Autonomous Coding Agents and AI Assistants

---

## 1. Specification Purpose
This specification defines the authoritative, ground-truth contracts of the **Samrey** framework.
Every autonomous coding agent (ChatGPT, Codex, Claude Code, Gemini CLI, Grok, Copilot, Cursor, etc.) must treat this document and its companion rules in the `ai/` directory as the definitive source of architectural truth.

---

## 2. Framework Identity & Design Philosophy
Samrey is an independent, compile-time fine-grained reactive web framework engineered for maximum runtime throughput, predictable deterministic behavior, and zero runtime waste.

### The Four Pillars
1. **Zero Virtual DOM (VDOM-Free)**:
   Component functions are factory constructors that execute **EXACTLY ONCE** on component initialization. Component bodies do **NOT** re-evaluate when reactive state updates. There is no VDOM reconciliation, tree-diffing, or shadow tree allocation.
2. **Compile-Time Static Hoisting**:
   Static HTML structure is hoisted outside the component body into immutable browser `<template>` cloning operations:
   ```ts
   const _tmpl$1 = template('<div class="card"><h2 ref="title"></h2><p ref="desc"></p></div>');
   ```
3. **Surgical Fine-Grained Bindings**:
   Reactive signals connect directly to specific target DOM nodes using surgical micro-primitives (`bindText`, `bindAttr`, `bindClass`, `bindStyle`, `on`). State mutations trigger localized $O(1)$ operations with zero component re-evaluation.
4. **Push-Pull Topological Reactivity**:
   A deterministic push-pull dependency graph with a global versioned transaction clock guarantees glitch-free atomic state propagation, circular dependency prevention, and automatic memory cleanup hierarchies.

---

## 3. Strict Prohibitions & Anti-Patterns
To prevent foreign framework contamination, AI agents must strictly observe:

| Forbidden Pattern | Reason | Samrey Native Replacement |
| :--- | :--- | :--- |
| `useState`, `useEffect`, `useMemo`, `useCallback`, `useRef`, `useContext` | Samrey is NOT React. Component functions do not re-run. React hooks fail or corrupt state. | `signal()`, `effect()`, `computed()`, `untrack()`, template references (`.refs`), `createContext()` |
| Mutating signal arrays/objects in-place (e.g. `items.value.push(x)`) | Signals compare references (`Object.is`). In-place mutation does NOT trigger reactivity. | `items.value = [...items.value, x]`, `items.update(arr => [...arr, x])`, or `@samrey/reactivity` `createStore()` |
| Writing `<Show>` or `<For>` as HTML template tags | Triggers compiler error `SAMREY-108`. In Samrey, control flow are component functions. | `Show({ when: () => cond.value, children: () => View() })`, `For({ each: () => list.value, key: i => i.id, children: (item) => Row(item) })` |
| Calling signals as getter functions: `count()` | Signals are objects, not functions. Calling `count()` throws `TypeError: count is not a function`. | Read with `count.value` or update with `count.set(x)` / `count.update(fn)` |
| Importing `react`, `react-dom`, `vue`, `@angular/core`, `svelte` | Samrey has zero foreign runtime dependencies. | Import exclusively from `@samrey/*` packages. |

---

## 4. Canonical Directory Layout
```
ai/
├── SPEC.md                     # This document (framework overview & specification contracts)
├── ARCHITECTURE.md             # Deep system architecture & execution lifecycle
├── API_CONTRACTS.md            # Complete verified TypeScript public API surface
├── REACTIVITY_RULES.md         # Rules for signals, computed, effects, stores, owners
├── COMPONENT_RULES.md          # Rules for components, templates, bindings, control flow
├── COMPILER_RULES.md           # Ahead-of-Time parsing, AIR, static hoisting, diagnostics
├── ROUTING_RULES.md            # Client-side router, outlets, link navigation, params
├── SSR_RULES.md                # Server-side rendering, streaming, and hydration
├── SECURITY_RULES.md           # Contextual sanitization, Trusted Types, CSRF, secrets
├── TESTING_RULES.md            # Headless testing harness, assertions, event dispatching
├── ERROR_REFERENCE.md          # Searchable catalog of SAMREY-101 to SAMREY-501
├── EXAMPLES_INDEX.md           # Verified production code examples index
├── VERSION_COMPATIBILITY.md    # SemVer, runtime targets, and ecosystem compatibility
└── skills/                     # 12 portable, vendor-neutral AI agent skills
    ├── samrey-core/
    ├── samrey-reactivity/
    ├── samrey-components/
    ├── samrey-compiler/
    ├── samrey-routing/
    ├── samrey-forms/
    ├── samrey-ssr/
    ├── samrey-security/
    ├── samrey-testing/
    ├── samrey-debugging/
    ├── samrey-performance/
    └── samrey-migration/
```

---

## 5. Specification Governance
This specification is verified continuously by automated test suites (`tests/docs-api-accuracy.test.ts`, `tests/code-validator-hardening.test.ts`, and `tests/ai-integration.test.ts`). Any PR introducing API changes or new features must update the corresponding `ai/*.md` contracts.
