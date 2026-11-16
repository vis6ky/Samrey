---
name: samrey-core
description: Core architecture, execution lifecycle, project scaffolding, and zero-VDOM invariants of Samrey.
---

# Samrey Core Architecture & Framework Invariants (`samrey-core`)

## 1. Skill Description & Activation Criteria
- **Purpose**: Guides an AI agent through understanding the conceptual foundation, execution model, and bootstrapping of a Samrey application.
- **Activation Criteria**: Trigger when onboarding to Samrey, initializing a new project, structuring application modules, or reasoning about why React/Vue idioms do not apply.

## 2. Framework Concepts
1. **Zero Virtual DOM**: Component functions execute **EXACTLY ONCE** upon instantiation. There is no reconciliation, tree diffing, or repeated component function evaluation.
2. **Compile-Time Static Hoisting**: Invariant HTML markup is lifted outside components into immutable `<template>` elements.
3. **Surgical Fine-Grained Bindings**: Signal updates trigger microscopic updates (`bindText`, `bindAttr`, `on`) targeted directly at individual DOM nodes in $O(1)$ time.
4. **Push-Pull Topologically Sorted Reactivity**: Glitch-free reactive state graph driven by a versioned transaction clock.

## 3. Correct API Usage
```bash
# Scaffolding
npx @samrey/cli create my-app --template ssr
cd my-app
npm install
npm run dev

# Testing & Building
npm test
npm run build
```

## 4. Verified Code Example
```ts
import { signal } from '@samrey/reactivity';
import { template, bindText, on } from '@samrey/runtime';

// Hoisted static template
const _tmpl = template('<button ref="btn" class="counter-btn">Count: <span ref="count"></span></button>');

export function Counter(props: { initial?: number }) {
  const count = signal(props.initial ?? 0);
  const root = _tmpl.clone();
  const { btn, count: countEl } = root.refs;

  bindText(countEl, () => count.value.toString());
  on(btn, 'click', () => count.update(n => n + 1));

  return root;
}
```

## 5. Common Mistakes
- **Mistake**: Placing initialization code expecting it to re-run on state change.
  - *Correction*: Code inside the component body runs once. Place dynamic operations inside `effect(() => ...)` or dynamic binding getters `() => expr`.
- **Mistake**: Using `document.querySelector` inside components instead of `.refs`.
  - *Correction*: Use template references `const { name, btn } = root.refs;` for $O(1)$ property access.

## 6. Forbidden Patterns
- ❌ Do NOT import React hooks (`useState`, `useEffect`).
- ❌ Do NOT write `<Show>` or `<For>` as template HTML markup tags.
- ❌ Do NOT call signals as functions (`count()`).

## 7. Validation Procedures
1. Run `npx @samrey/cli check` to verify framework idiom adherence.
2. Run `npm test` to verify zero test failures.

## 8. Authoritative Documentation
- [ai/SPEC.md](../../SPEC.md)
- [ai/ARCHITECTURE.md](../../ARCHITECTURE.md)
