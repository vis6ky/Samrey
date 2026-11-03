# Table 1: Samrey Package Architecture

| Package Name | Functional Category | Primary Responsibility | Key Public Primitives & Classes | Runtime Overhead (Est.) |
| :--- | :--- | :--- | :--- | :---: |
| **`@samrey/reactivity`** | Foundational State | Glitch-free topological signal dependency graph | `signal`, `computed`, `effect`, `batch`, `untrack`, `createStore`, `produce`, `onCleanup`, `createOwner` | ~1.8 kB min+br |
| **`@samrey/security`** | Defensive Runtime | Zero-trust sanitizers, Trusted Types, CSRF defense | `sanitizeUri`, `sanitizeHtml`, `sanitizeCssStyle`, `escapeHtmlAttribute`, `createCsrfToken`, `stripSecrets` | ~1.4 kB min+br |
| **`@samrey/runtime`** | DOM Execution | Direct DOM creation, `<template>` cloning, lifecycle | `el`, `svgEl`, `text`, `frag`, `Show`, `For`, `mount`, `hydrate`, `bindText`, `bindAttr`, `bindClass`, `on` | ~2.5 kB min+br |
| **`@samrey/compiler`** | AOT Translation | TypeScript AST parsing, AIR generation, codegen | `compile`, `parseAIR`, `optimizeAIR`, `generateCode`, `auditSecurityInvariants` | Build-time only |
| **`@samrey/router`** | Navigation | Type-safe route matching, nested layouts, loaders | `createRouter`, `useParams`, `useNavigate`, `useLocation`, `Link`, `RouteView`, `defineLoader` | ~2.9 kB min+br |
| **`@samrey/http`** | Data Fetching | Reactive resource cache, abort controller, retry | `createHttpClient`, `createResource`, `createHttpCache`, `RequestCache`, `HttpError` | ~1.6 kB min+br |
| **`@samrey/forms`** | Form & Schema | Standard Schema validator auto-binding, ARIA | `createForm`, `createField`, `computeAriaAttributes`, `getAccessibleFieldProps`, `FormError` | ~2.1 kB min+br |
| **`@samrey/ssr`** | Server Pipeline | Out-of-order HTML streaming, safe JSON state serializer | `renderToString`, `renderToStream`, `serializeForHydration`, `createSSRContext`, `SafeHtml` | ~2.7 kB (Node/Edge) |
| **`@samrey/testing`** | Verification | Headless reactive harness, mock DOM assertions | `renderTest`, `fireEvent`, `flushReactivity`, `createTestHarness`, `mockFetch` | Test-time only |
| **`@samrey/devtools`** | Inspection | Signal graph profiler, time-travel bridge | `connectDevTools`, `inspectOwnerTree`, `captureGraphSnapshot`, `replayAction` | Dev-time only |
| **`@samrey/cli`** | Developer Tooling | Vite plugin, scaffolding, static security auditor | `vitePluginSamrey`, `createProject`, `auditProject`, `typegenRoutes` | CLI tooling only |
