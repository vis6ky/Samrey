# Gati Framework — Phase 19 Public API Export Verification Report
Target Version: 1.0.0-rc.1
License: Apache-2.0

## Executive Summary
This document provides an exhaustive, automated verification of all public APIs across the 11 `@gati/*` packages in the monorepo, compared directly against `docs/PUBLIC_API.md`.

All public symbols were loaded, invoked, and validated in an isolated clean-room consumer environment.

---

## Package Verification Matrix

### 1. `@gati/reactivity`
- **Status:** PASS
- **Exports Verified:**
  - `signal` (Signal constructor)
  - `computed` (Computed signal)
  - `createMemo` (Alias for computed)
  - `effect` (Reactive side-effect observer)
  - `batch` (Transaction batching primitive)
  - `untrack` (Untracked read helper)
  - `createStore` (Proxy-based fine-grained reactive store)
  - `produce` (Immer-style mutating draft producer)
  - `reconcile` (Diffing store updater)
  - `createRoot` (Disposal root constructor)
  - `createContext` (Context object factory)
  - `useContext` (Context value consumer)
  - `createOwner`, `getOwner`, `runWithOwner`, `onCleanup`

### 2. `@gati/runtime`
- **Status:** PASS
- **Exports Verified:**
  - `el` (Fine-grained DOM / Headless node builder)
  - `svg` / `svgEl` (SVG namespace element builder)
  - `frag` / `fragment` (Document fragment creator)
  - `text` (Text node binder)
  - `rawHtml` (Sanitized HTML node binder)
  - `mount` (Application DOM mounting primitive)
  - `hydrate` / `hydrateFromSSR` (Client-side hydration primitive)
  - `Show` (Conditional branch control flow)
  - `For` (Keyed list reconciliation control flow)
  - `Switch` & `Match` (Multi-branch switch control flow)
  - `ErrorBoundary` (Runtime error catching boundary)
  - `Dynamic` (Component switcher)
  - `Portal` (Targeted mounting portal)
  - `Suspense` (Async component boundary)
  - `onMount`, `onCleanup`, `onError`
  - `createComponent`

### 3. `@gati/security`
- **Status:** PASS
- **Exports Verified:**
  - `sanitizeHtml` / `sanitizeHtmlString` (AST tag/attribute sanitizer)
  - `sanitizeUrl` / `sanitizeUri` (Protocol & scheme validator)
  - `sanitizeAttribute` / `escapeHtmlAttribute` (HTML attribute escaper)
  - `escapeHtmlText` (HTML text escaper)
  - `isSafeUrl` (Safe URI scheme detector)
  - `safeJsonParse` (Prototype pollution protected JSON parser)
  - `safeJsonStringify` / `escapeForScriptPayload` (XSS-safe JSON stringifier)
  - `createCsrfToken` (Cryptographically random CSRF generator)
  - `validateCsrfToken` (Timing-safe constant-time CSRF validator)
  - `TrustedTypesPolicy` / `getGatiTrustedPolicy` (W3C Trusted Types provider)

### 4. `@gati/compiler`
- **Status:** PASS
- **Exports Verified:**
  - `compileTemplate` (Gati template to AIR & JS compiler)
  - `parseTemplate` (Recursive-descent template parser)
  - `buildAIR` / `buildAIRFromAST` (Intermediate representation builder)
  - `generateCode` / `generateModuleCode` (JS Code generator)
  - `classifySecurityNode` / `classifyBindingContext` (Security context classifier)
  - `lintAccessibility` / `lintA11y` (Static accessibility linter)
  - `GatiCompilerError` (Structured compiler error class)
  - `generateSourceFrame` (Source code frame generator)
  - `ERROR_REGISTRY` (Standard compiler and runtime error definitions)

### 5. `@gati/router`
- **Status:** PASS
- **Exports Verified:**
  - `createRouter` (Router state machine and navigation engine)
  - `matchPath` / `matchRoute` (Route path & param matcher)
  - `matchRoutes` (Multi-route matcher)
  - `createLink` (Link interaction helper)
  - `Router` (Router component)
  - `Route` (Route declaration helper)
  - `Link` (Active navigation link component)
  - `useRouter`, `useParams`, `useLocation`, `useSearchParams`
  - `createBrowserHistory`, `createMemoryHistory`

### 6. `@gati/http`
- **Status:** PASS
- **Exports Verified:**
  - `createResource` (Reactive async resource manager)
  - `httpClient` (Typed, interceptable HTTP client)
  - `createHttpCache` (In-memory TTL HTTP cache with cache invalidation)
  - `HttpError` (HTTP response error class)

### 7. `@gati/forms`
- **Status:** PASS
- **Exports Verified:**
  - `createForm` (Reactive schema form manager)
  - `createField` (Fine-grained field validator and state tracker)
  - `validateSchema` (Standard Schema ~v1 executor)
  - `getAccessibleFieldProps` (ARIA & accessibility attributes generator)

### 8. `@gati/ssr`
- **Status:** PASS
- **Exports Verified:**
  - `renderToString` (Async SSR HTML renderer with state serialization)
  - `renderToStream` (Web Streams streaming HTML renderer)
  - `generateStaticSite` (Multi-page SSG generator with sitemap support)
  - `hydrate` / `hydrateFromSSR` (Client-side hydration coordinator)
  - `stripSecrets` / `sanitizeSsrState` (Secret credential scrubbing engine)
  - `serializeStateForHydration` / `escapeJsonState` (Script injection safe JSON state tag builder)
  - `createSSRContext`, `runWithSSRContext`, `resolveSSRContext`

### 9. `@gati/testing`
- **Status:** PASS
- **Exports Verified:**
  - `renderTestComponent` (Isolated container test renderer)
  - `fireEvent` (Synthetic event dispatcher)
  - `waitFor` (Microtask reactive settling poller)
  - `cleanupAllTestContainers` (Test container disposal coordinator)
  - `createMockResource` (Test HTTP resource mock builder)

### 10. `@gati/devtools`
- **Status:** PASS
- **Exports Verified:**
  - `DevToolsBridge`, `aetherDevToolsBridge`, `GatiDevToolsBridge`
  - `initDevTools` (Origin-locked DevTools initializer)
  - `GraphInspector`, `ReactiveGraphInspector` (Signal dependency graph inspector)
  - `ComponentInspector` (Component hierarchy inspector)
  - `PerformanceInspector`, `PerfInspector` (Fine-grained update profiler)
  - `NetworkInspector`, `FormInspector`, `RouterInspector`

### 11. `@gati/cli`
- **Status:** PASS
- **Exports Verified:**
  - `runCLI` (Command-line interface runner)
  - `generateStarterProject` (Template generator: ssr, spa, minimal, ssg)
  - `aetherVitePlugin` (Vite compiler integration plugin)
  - `runGatiAudit` (Security and accessibility auditor)
  - `CLI_VERSION` (Version constant = '1.0.0-rc.1')

---

## Independent Consumer Execution Proof
Executed inside `/tmp/aether-release-consumer` using packed `.tgz` artifacts:
- Tarballs packed: 11
- Successful package installations: 11/11
- Zero external UI dependencies detected: PASS
- TypeScript compile validation: 0 errors
