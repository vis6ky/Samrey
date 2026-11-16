# Samrey Framework — Version & Compatibility Guide (VERSION_COMPATIBILITY.md)

**Version:** 2.1.0  
**Authority:** Compatibility Requirements for Runtimes, Node.js, Browsers & Build Systems

---

## 1. Node.js & Server Runtime Support
- **Node.js**: Versions **18.18+**, **20.x**, and **22.x** are officially supported.
- **Bun**: 1.0+ compatible (SSR & CLI).
- **Deno**: 1.38+ compatible via npm specifiers.

---

## 2. Browser Targets
- **Evergreen Browsers**: Chrome 90+, Edge 90+, Firefox 88+, Safari 15+.
- **Language Level**: ECMAScript 2022+ output.
- **Required Browser Primitives**:
  - `<template>` HTML element cloning (`HTMLTemplateElement`).
  - Native EventTarget / CustomEvent.
  - Proxy & Reflect (for `@samrey/reactivity` stores).
  - W3C Trusted Types (optional, polyfill-free fallback provided).

---

## 3. SemVer & Monorepo Lockstep Releases
All 13 official `@samrey/*` packages are released under a unified lockstep versioning scheme (currently **2.1.0**).
Mixing major or minor versions across packages is unsupported.
```json
{
  "dependencies": {
    "@samrey/reactivity": "^2.1.0",
    "@samrey/runtime": "^2.1.0",
    "@samrey/compiler": "^2.1.0",
    "@samrey/router": "^2.1.0",
    "@samrey/forms": "^2.1.0",
    "@samrey/http": "^2.1.0",
    "@samrey/ssr": "^2.1.0",
    "@samrey/security": "^2.1.0"
  },
  "devDependencies": {
    "@samrey/cli": "^2.1.0",
    "@samrey/testing": "^2.1.0"
  }
}
```
