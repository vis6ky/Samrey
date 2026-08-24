# Aether Framework — Troubleshooting & Diagnostic Guide

**Target Version:** 1.0.0-rc.1  
**License:** Apache-2.0  

---

## 1. Common Diagnostics & Solutions

### Issue: "AETH-SEC-001: Potential XSS in HTML string"
- **Cause:** Raw unsanitized HTML passed into innerHTML or template binding without explicit escaping.
- **Solution:** Pass the HTML through `sanitizeHtml(rawHtml)` from `@aether/security`.

### Issue: "AETH-REC-002: Circular signal computation detected"
- **Cause:** A computed property or effect is writing to a signal that it synchronously reads.
- **Solution:** Use `untrack(() => signal.value)` or separate the write phase into a batch transaction using `batch(() => ...)`.

### Issue: "AETH-RTR-004: No matching route found"
- **Cause:** Requested URL path does not match any route definition and no fallback `*` (wildcard) route is defined.
- **Solution:** Add a catch-all route `{ path: '*', component: NotFoundComponent }` to your route tree.

### Issue: "AETH-SSR-003: Hydration mismatch between server and client"
- **Cause:** Dynamic non-deterministic state (e.g. `Date.now()`, `Math.random()`) differed between server render and client mount.
- **Solution:** Serialize server state using `serializeStateForHydration()` and deserialize using `hydrateFromSSR()`.

---

## 2. DevTools & Debugging Support

Aether provides real-time state and component tree inspection:

```typescript
import { initDevTools } from '@aether/devtools';

// Initialize in development mode
if (process.env.NODE_ENV !== 'production') {
  initDevTools();
}
```
Open browser developer tools to inspect signal dependencies and transaction timelines.
