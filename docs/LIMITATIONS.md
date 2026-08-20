# Aether Framework — Known Limitations & Constraints

**Version: 1.0.0-rc.1**  
*Last Updated: August 20, 2026*

This document provides a transparent overview of architectural trade-offs, intentional constraints, and known limitations in Aether `1.0.0-rc.1`.

---

## 1. Reactivity Engine Constraints

### Signal Reading within Tracked Contexts
- Reading a signal value outside an active reactive root (`createRoot`, `createOwner`, `effect`, or `computed`) will return the raw value without tracking dependencies.
- **Guideline**: Ensure state dependencies intended for reactive updates are accessed inside component setup functions, `effect()` callbacks, or `computed()` derivations.

### Direct Mutation vs. Signals
- Plain JavaScript objects and arrays do not trigger reactive updates upon in-place property mutation (`obj.x = 10`).
- **Solution**: Use `createStore()` for deep reactive proxies or update signal primitives with immutable replacements (`items.set([...items.value, newItem])`).

---

## 2. Compiler & Syntax Constraints

### JSX/TSX Compilation Target
- Aether's AOT compiler compiles JSX elements to static `<template>` clones and surgical hole path binding arrays. It does not produce React `createElement()` calls.
- Third-party React component libraries (e.g. standard Material UI or Radix React wrappers) cannot be imported directly without an adapter layer.

### Root Node Expressions
- Top-level component return values should have a single container node or utilize fragment templates. Returning bare primitive numbers/strings without a DOM wrapping node will create a single text node wrapper.

---

## 3. Hydration & SSR Constraints

### Client-Server Time & Randomness Skew
- If an SSR component renders `new Date().toISOString()` or `Math.random()`, the client DOM might mismatch if not hydrated from serialized server state.
- **Solution**: Store non-deterministic values in the SSR state context (`createSSRContext({ timestamp })`) so the client hydration reads the identical server value.

### HTML Formatting Differences
- Browser DOM parsers automatically normalize certain HTML attributes (such as `checked=""` to `checked`). Aether's hydration reconciler automatically handles attribute normalization without throwing runtime errors.

---

## 4. Platform Compatibility & Environment

### Node.js Engine
- Aether requires Node.js version `>= 18.0.0` (with full support for WHATWG `ReadableStream`, `fetch`, and ECMAScript Modules).

### Browser Compatibility
- Modern evergreen browsers (Chrome, Edge, Firefox, Safari iOS 15+) supporting standard ES2022 modules, `<template>`, and standard DOM APIs.
- Legacy Internet Explorer is explicitly not supported.
