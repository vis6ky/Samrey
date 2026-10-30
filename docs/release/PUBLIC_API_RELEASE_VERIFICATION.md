# Samrey Framework — Public API Release Verification Report

**Target Version:** 1.0.0-rc.1  
**Audit Date:** 2026-08-21  
**Authoritative Contract:** `docs/PUBLIC_API.md`  
**Overall Status:** PASS (100% Export Parity)  

---

## 1. Export Parity Matrix by Package

| Package | Expected Exports | Actual Exports | Missing | Status |
| :--- | :--- | :--- | :--- | :--- |
| `@samrey/reactivity` | 15 | 30 | 0 | **PASS** |
| `@samrey/runtime` | 18 | 44 | 0 | **PASS** |
| `@samrey/security` | 10 | 27 | 0 | **PASS** |
| `@samrey/compiler` | 9 | 19 | 0 | **PASS** |
| `@samrey/router` | 14 | 17 | 0 | **PASS** |
| `@samrey/http` | 4 | 8 | 0 | **PASS** |
| `@samrey/forms` | 4 | 7 | 0 | **PASS** |
| `@samrey/ssr` | 9 | 23 | 0 | **PASS** |
| `@samrey/testing` | 6 | 9 | 0 | **PASS** |
| `@samrey/devtools` | 9 | 24 | 0 | **PASS** |
| `@samrey/cli` | 13 | 18 | 0 | **PASS** |

## 2. Detailed Symbol Breakdown

### `@samrey/reactivity`
- **Contract Symbols (15):** `signal`, `computed`, `effect`, `batch`, `untrack`, `createStore`, `produce`, `reconcile`, `createMemo`, `createRoot`, `getOwner`, `runWithOwner`, `onCleanup`, `createContext`, `useContext`
- **Runtime Parity:** 100% Match

### `@samrey/runtime`
- **Contract Symbols (18):** `el`, `svg`, `fragment`, `text`, `mount`, `hydrate`, `Show`, `For`, `Switch`, `Match`, `ErrorBoundary`, `Dynamic`, `Portal`, `Suspense`, `onMount`, `onCleanup`, `onError`, `createComponent`
- **Runtime Parity:** 100% Match

### `@samrey/security`
- **Contract Symbols (10):** `sanitizeHtml`, `sanitizeUrl`, `sanitizeAttribute`, `isSafeUrl`, `safeJsonParse`, `safeJsonStringify`, `createCsrfToken`, `validateCsrfToken`, `TrustedTypesPolicy`, `escapeHtmlText`
- **Runtime Parity:** 100% Match

### `@samrey/compiler`
- **Contract Symbols (9):** `compileTemplate`, `parseTemplate`, `buildAIR`, `generateCode`, `classifySecurityNode`, `lintAccessibility`, `SamreyCompilerError`, `generateSourceFrame`, `ERROR_REGISTRY`
- **Runtime Parity:** 100% Match

### `@samrey/router`
- **Contract Symbols (14):** `Router`, `Route`, `Link`, `useRouter`, `useParams`, `useSearchParams`, `useLocation`, `matchRoute`, `matchPath`, `matchRoutes`, `createLink`, `createBrowserHistory`, `createMemoryHistory`, `createRouter`
- **Runtime Parity:** 100% Match

### `@samrey/http`
- **Contract Symbols (4):** `createResource`, `httpClient`, `createHttpCache`, `HttpError`
- **Runtime Parity:** 100% Match

### `@samrey/forms`
- **Contract Symbols (4):** `createForm`, `createField`, `validateSchema`, `getAccessibleFieldProps`
- **Runtime Parity:** 100% Match

### `@samrey/ssr`
- **Contract Symbols (9):** `renderToString`, `renderToStream`, `generateStaticSite`, `hydrateFromSSR`, `escapeHtml`, `escapeJsonState`, `sanitizeSsrState`, `stripSecrets`, `serializeStateForHydration`
- **Runtime Parity:** 100% Match

### `@samrey/testing`
- **Contract Symbols (6):** `renderTestComponent`, `fireEvent`, `waitFor`, `waitForNextUpdate`, `createMockResource`, `cleanupAllTestContainers`
- **Runtime Parity:** 100% Match

### `@samrey/devtools`
- **Contract Symbols (9):** `initDevTools`, `SamreyDevToolsBridge`, `ReactiveGraphInspector`, `ComponentInspector`, `PerfInspector`, `DevToolsBridge`, `samreyDevToolsBridge`, `GraphInspector`, `PerformanceInspector`
- **Runtime Parity:** 100% Match

### `@samrey/cli`
- **Contract Symbols (13):** `runCLI`, `generateStarterProject`, `samreyVitePlugin`, `runCreateCommand`, `runDevCommand`, `runBuildCommand`, `runPreviewCommand`, `runTestCommand`, `runAuditCommand`, `runAnalyzeCommand`, `runGenerateCommand`, `CLI_VERSION`, `runSamreyAudit`
- **Runtime Parity:** 100% Match
