---
name: samrey-overview
description: Understand the core architecture, zero-VDOM compile-time model, and execution invariants of the Samrey framework.
---

# Samrey Framework Architecture & Overview

## Purpose
Use this skill when understanding the conceptual foundation of Samrey, answering architectural questions, or designing high-performance web applications without a Virtual DOM.

## When to Use
- When onboarding an AI agent to the Samrey codebase.
- When planning application architecture and module boundaries.
- When explaining why React or Vue idioms cannot be directly used in Samrey.

## Core Architectural Invariants
1. **Zero Virtual DOM**: Component functions execute **EXACTLY ONCE** on mount. They do NOT re-run on signal updates.
2. **Compile-Time Static Hoisting**: The compiler extracts HTML skeletons into hoisted browser `<template>` elements (`_tmpl$1 = template("...")`).
3. **Fine-Grained Surgical DOM Updates**: Signals trigger micro-updates targeting specific text nodes or attributes via `bindText` and `bindAttr`.
4. **Pure Signals**: Reactive state is driven by `signal()`, `computed()`, `effect()`, and `store()` from `@samrey/reactivity`.

## Common Mistakes
- **Mistake**: Expecting the component function to re-execute like a React function component when state changes.
  - **Correction**: Place reactive signal reads inside callbacks passed to `bindText(() => count.value)` or `Show({ when: () => condition.value })`.
- **Mistake**: Using React hooks (`useState`, `useEffect`).
  - **Correction**: Use `signal()` and `effect()` from `@samrey/reactivity`.

## Validation Instructions
Verify that components execute only once and all reactive updates are localized to dynamic DOM bindings.
