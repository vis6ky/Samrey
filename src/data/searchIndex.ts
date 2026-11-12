/**
 * @license Apache-2.0
 * @samrey/doc - Repository Documentation & Knowledge Search Index
 *
 * Searchable knowledge index compiled exclusively from official repository documentation:
 * - docs/*.md (Architecture, Public API, Error Codes, Security, Forms, Router, SSR, etc.)
 * - packages/* /README.md (Package specifications and APIs)
 * - examples/* (Starter templates, code examples, guides)
 *
 * Strictly excludes: node_modules, dist, build artifacts, .git, temp files, secrets, credentials, .env
 */

export interface DocChunk {
  id: string;
  title: string;
  sourcePath: string;
  category: 'reactivity' | 'runtime' | 'forms' | 'router' | 'http' | 'ssr' | 'security' | 'compiler' | 'errors' | 'testing' | 'cli' | 'examples' | 'migration' | 'general';
  headings: string[];
  keywords: string[];
  apis: string[];
  errorCodes: string[];
  summary: string;
  content: string;
  docUrl: string;
}

/**
 * Authoritative Repository Documentation Chunks
 */
export const REPOSITORY_DOC_CHUNKS: DocChunk[] = [
  // 1. PUBLIC_API.md
  {
    id: 'doc-public-api',
    title: 'Public API Authoritative Reference',
    sourcePath: 'docs/PUBLIC_API.md',
    category: 'general',
    headings: ['Architectural Principles', '@samrey/reactivity', '@samrey/runtime', '@samrey/compiler', '@samrey/security', '@samrey/router', '@samrey/forms', '@samrey/http', '@samrey/ssr', '@samrey/testing', '@samrey/devtools', '@samrey/cli'],
    keywords: ['public api', 'api reference', 'contract', 'exports', 'interfaces', 'types', 'packages', 'reactivity', 'runtime', 'security', 'compiler', 'router', 'forms', 'http', 'ssr', 'testing', 'devtools', 'cli'],
    apis: ['signal', 'computed', 'effect', 'batch', 'untrack', 'createStore', 'produce', 'reconcile', 'createMemo', 'createRoot', 'getOwner', 'runWithOwner', 'onCleanup', 'createContext', 'useContext', 'el', 'svg', 'fragment', 'mount', 'hydrate', 'template', 'bindText', 'bindAttr', 'bindClass', 'on', 'Show', 'For', 'Switch', 'Match', 'Dynamic', 'ErrorBoundary', 'compileTemplate', 'parseTemplate', 'generateModuleCode', 'buildAIRFromAST', 'lintA11y', 'sanitizeHtml', 'sanitizeUri', 'sanitizeUrl', 'sanitizeRedirectUri', 'sanitizeCssStyle', 'escapeForScriptPayload', 'getSamreyTrustedPolicy', 'getSamreyTemplateTrustedPolicy', 'safeJsonParse', 'generateCsrfToken', 'verifyCsrfToken', 'createRouter', 'RouterOutlet', 'useParams', 'useLocation', 'useNavigate', 'Link', 'createForm', 'createField', 'bindField', 'validateSchema', 'HttpClient', 'createHttpClient', 'createResource', 'renderToString', 'renderToStream', 'serializeStateForHydration', 'escapeJsonState', 'renderTest', 'fireEvent', 'flushReactivity', 'initDevTools', 'getGraphSnapshot', 'runCLI', 'generateStarterProject'],
    errorCodes: [],
    summary: 'Authoritative Public API contract for all 13 packages in Samrey v2.1.0. Details every public function, type interface, and usage target.',
    content: `# Samrey Framework — Public API Authoritative Reference
Contract for all 13 packages comprising the Samrey Framework:
1. @samrey/reactivity: signal, computed, effect, batch, untrack, createStore, produce, reconcile, createMemo, createRoot, getOwner, runWithOwner, onCleanup, createContext, useContext.
2. @samrey/runtime: template, bindText, bindAttr, bindClass, on, el, svg, fragment, mount, hydrate, Show, For, Switch, Match, Dynamic, ErrorBoundary, rawHtml.
3. @samrey/compiler: compileTemplate, parseTemplate, generateModuleCode, buildAIRFromAST, hoistTemplates, lintA11y, evaluateConstantExpression.
4. @samrey/security: sanitizeHtmlString (sanitizeHtml), sanitizeUri (sanitizeUrl), sanitizeRedirectUri, sanitizeCssStyle, escapeForScriptPayload, safeJsonParse, generateCsrfToken, verifyCsrfToken, getSamreyTrustedPolicy, getSamreyTemplateTrustedPolicy.
5. @samrey/router: createRouter, Router, Route, RouterOutlet, Link, useRouter, useParams, useLocation, useNavigate, useSearchParams.
6. @samrey/forms: createForm, createField, bindField, validateSchema, computeAriaAttributes, getAccessibleFieldProps.
7. @samrey/http: HttpClient, createHttpClient, createResource, RequestCache.
8. @samrey/ssr: renderToString, renderToStream, serializeStateForHydration (escapeJsonState), hydrateFromSSR, generateStaticSite, createSSRContext, stripSecrets.
9. @samrey/testing: renderTest, renderTestComponent, fireEvent, flushReactivity, waitFor, waitForNextUpdate, cleanupAllTestContainers.
10. @samrey/devtools: initDevTools, SamreyDevToolsBridge, GraphInspector, getGraphSnapshot, ComponentInspector, PerformanceInspector.
11. @samrey/cli: runCLI, generateStarterProject, samreyVitePlugin, auditSource (create, dev, build, preview, test, audit, analyze, generate).
12. @samrey/ai: validateSamreyCode, diagnoseCompilerError, searchDocs, analyzeProject, generateAgentsMd.
13. @samrey/mcp-server: SamreyMcpServer, MCP_TOOLS, MCP_RESOURCES, handleToolCall.`,
    docUrl: '#architecture'
  },

  // 2. ERROR_CODES.md
  {
    id: 'doc-error-codes',
    title: 'Deterministic Error Codes Reference (SAMREY-xxx)',
    sourcePath: 'docs/ERROR_CODES.md',
    category: 'errors',
    headings: ['CLI & Tooling (SAMREY-001 - SAMREY-099)', 'Compiler & Parsing (SAMREY-101 - SAMREY-199)', 'Security & A11y (SAMREY-201 - SAMREY-299)', 'Reactivity & Runtime (SAMREY-301 - SAMREY-399)', 'Router & Navigation (SAMREY-401 - SAMREY-499)', 'Forms & Validation (SAMREY-501 - SAMREY-599)', 'HTTP & Data Fetching (SAMREY-601 - SAMREY-699)', 'SSR & Hydration (SAMREY-701 - SAMREY-799)', 'DevTools & Testing (SAMREY-801 - SAMREY-899)'],
    keywords: ['error codes', 'samrey', 'aeth', 'diagnostics', 'troubleshooting', 'error handling', 'samrey-001', 'samrey-101', 'samrey-108', 'samrey-201', 'samrey-301', 'samrey-401', 'samrey-501', 'samrey-601', 'samrey-701', 'samrey-801', 'recovery', 'stack trace'],
    apis: ['SamreyCompilerError', 'formatSamreyDiagnostic', 'ERROR_REGISTRY'],
    errorCodes: ['SAMREY-001', 'SAMREY-002', 'SAMREY-003', 'SAMREY-004', 'SAMREY-005', 'SAMREY-101', 'SAMREY-102', 'SAMREY-103', 'SAMREY-104', 'SAMREY-105', 'SAMREY-106', 'SAMREY-108', 'SAMREY-109', 'SAMREY-110', 'SAMREY-111', 'SAMREY-201', 'SAMREY-202', 'SAMREY-203', 'SAMREY-204', 'SAMREY-205', 'SAMREY-301', 'SAMREY-302', 'SAMREY-303', 'SAMREY-304', 'SAMREY-305', 'SAMREY-306', 'SAMREY-401', 'SAMREY-402', 'SAMREY-403', 'SAMREY-404', 'SAMREY-501', 'SAMREY-502', 'SAMREY-503', 'SAMREY-504', 'SAMREY-601', 'SAMREY-602', 'SAMREY-603', 'SAMREY-604', 'SAMREY-701', 'SAMREY-702', 'SAMREY-703', 'SAMREY-704', 'SAMREY-705', 'SAMREY-801', 'SAMREY-802', 'SAMREY-803'],
    summary: 'Complete diagnostic error code catalog from SAMREY-001 to SAMREY-899 with exact root-cause analysis and recovery suggestions.',
    content: `# Samrey Error Codes Catalog (SAMREY-xxx)
- SAMREY-101: Template Syntax Error. Unclosed tag or invalid JSX/template expression. Fix: ensure matching tags.
- SAMREY-102: Invalid Expression / Unclosed Interpolation.
- SAMREY-108: Unsupported Template-Level Control Flow or Custom Component Tag. Compose with Show()/For() in TypeScript.
- SAMREY-201: Insecure URI Protocol. Detected javascript: or vbscript: protocol in href/src. Fix: use safe URL.
- SAMREY-202: Accessibility Non-Conformance. Element missing alt, aria-label, or label association.
- SAMREY-203: Prototype Pollution Detected. Deserialized payload contains dangerous keys. Fix: use safeJsonParse().
- SAMREY-301: Circular Dependency in Computed Signal / Effect. Break cycle with untrack().
- SAMREY-302: Duplicate Key in <For> Control Flow. Supply unique key callback.
- SAMREY-303: Hydration Mismatch / Lifecycle Hook Error.
- SAMREY-401: Unmatched Route Path. Register catch-all '*' route or check navigation URL.
- SAMREY-402: HTTP Resource Error. Handle request failure via ErrorBoundary or error handler.
- SAMREY-501: Form Schema Validation Failure. Field value violates Standard Schema constraint.
- SAMREY-502: Unregistered Field Access / Missing CSRF verification.
- SAMREY-601: HTTP Network Timeout. Check network or retry with backoff.
- SAMREY-602: Invalid HTTP Response Status (4xx/5xx).
- SAMREY-701: SSR Hydration Mismatch. Defer browser APIs to onMount().
- SAMREY-702: Secret Leakage in SSR State. Secret credentials scrubbed by stripSecrets().`,
    docUrl: '#docs'
  },

  // 3. REACTIVITY_AND_CONTROL_FLOW.md & @samrey/reactivity README
  {
    id: 'doc-reactivity',
    title: 'Reactivity Engine & State Management (@samrey/reactivity)',
    sourcePath: 'docs/REACTIVITY_AND_CONTROL_FLOW.md',
    category: 'reactivity',
    headings: ['Topological Push-Pull Signal Engine', 'Key Reactive Primitives', 'Memory Management & Owner Lifecycle', 'Deep Reactive Stores', 'Atomic Batching'],
    keywords: ['reactivity', 'signal', 'computed', 'effect', 'batch', 'untrack', 'createStore', 'produce', 'reconcile', 'createMemo', 'createRoot', 'onCleanup', 'globalClock', 'push pull', 'signals', 'state management'],
    apis: ['signal', 'computed', 'effect', 'batch', 'untrack', 'createStore', 'produce', 'reconcile', 'createMemo', 'createRoot', 'onCleanup', 'createContext', 'useContext'],
    errorCodes: ['SAMREY-301', 'SAMREY-302'],
    summary: 'Fine-grained push-pull topological signal engine with monotonic transaction clock, automatic batching, deep reactive proxy stores, and Owner memory disposal.',
    content: `# Reactivity & State in Samrey (@samrey/reactivity)
Samrey uses a topological push-pull signal graph. Components run ONCE during setup.
- signal(initialValue): Creates a read-write reactive atom. Read via .value, mutate via .value = next, .set(), or .update().
- computed(fn): Memoized derived calculation lazily evaluated on pull and cached until upstream dependencies change.
- effect(fn): Side-effect subscriber running immediately and re-executing when read signals mutate. Returns cleanup function.
- batch(fn): Groups multiple signal writes into a single atomic notification transaction.
- untrack(fn): Reads signal values without subscribing.
- createStore(initialState): Deep reactive proxy store with nested property tracking.
- produce(draft, fn): Immutable-style mutable draft mutations.
- reconcile(target, source): Structural reconciliation preserving unchanged object references.
- createRoot(fn) & onCleanup(fn): Lifecycle ownership and memory leak prevention.`,
    docUrl: '#reactivity'
  },

  // 4. TEMPLATES_AND_COMPONENTS.md & @samrey/runtime README
  {
    id: 'doc-runtime-templates',
    title: 'Runtime Engine & Direct DOM Cloning (@samrey/runtime)',
    sourcePath: 'docs/TEMPLATES_AND_COMPONENTS.md',
    category: 'runtime',
    headings: ['The Template Cloning Model', 'Component Composition', 'Native el() Factory', 'Declarative Control Flow: Show & For', 'Mount and Hydration'],
    keywords: ['runtime', 'dom', 'el', 'template', 'cloneNode', 'show', 'for', 'switch', 'match', 'mount', 'hydrate', 'components', 'fragment', 'svg', 'errorBoundary', 'dynamic', 'zero vdom'],
    apis: ['el', 'svg', 'fragment', 'mount', 'hydrate', 'Show', 'For', 'Switch', 'Match', 'Dynamic', 'ErrorBoundary', 'template', 'bindText'],
    errorCodes: ['SAMREY-303'],
    summary: 'Direct DOM creation via native <template> cloneNode(true) hoisting and fine-grained reactive attribute and text bindings with zero Virtual DOM overhead.',
    content: `# Runtime & DOM Components (@samrey/runtime)
Samrey completely avoids Virtual DOM reconciliation.
- el(tag, props, ...children): Creates native HTML elements with reactive prop bindings. Functions passed as props are automatically tracked.
- Show({ when, fallback, children }): High-performance conditional branch rendering.
- For({ each, key, fallback, children }): Keyed list reconciliation with minimal DOM moves.
- mount(component, container): Mounts a root component into a DOM element with lifecycle scope.
- hydrate(component, container): Resumes reactivity on server-rendered HTML.
- Dynamic({ component, ...props }): Renders a dynamic component or HTML tag determined at runtime.
- ErrorBoundary({ fallback, children }): Catches rendering errors in subtrees.`,
    docUrl: '#architecture'
  },

  // 5. FORMS_AND_VALIDATION.md & @samrey/forms README
  {
    id: 'doc-forms-validation',
    title: 'Forms & Schema Validation (@samrey/forms)',
    sourcePath: 'docs/FORMS_AND_VALIDATION.md',
    category: 'forms',
    headings: ['Standard Schema Integration', 'Creating a Reactive Form', 'Automated ARIA & Accessibility Bindings', 'Prototype Pollution Defense', 'bindField Helper'],
    keywords: ['forms', 'form validation', 'createForm', 'createField', 'bindField', 'schema', 'zod', 'valibot', 'arktype', 'standard schema', 'aria', 'accessibility', 'csrf', 'prototype pollution'],
    apis: ['createForm', 'createField', 'bindField', 'validateSchema', 'computeAriaAttributes', 'getAccessibleFieldProps'],
    errorCodes: ['SAMREY-501', 'SAMREY-502', 'SAMREY-503', 'SAMREY-504'],
    summary: 'First-class form management with Standard Schema (Zod/Valibot/ArkType) validation, automated ARIA state derivation (aria-invalid, aria-describedby), and prototype pollution scrubbing.',
    content: `# Forms & Validation in Samrey (@samrey/forms)
- createForm({ initialValues, validators, onSubmit }): Creates a reactive form instance with typed field signals, errors, dirty, and touched states.
- Standard Schema: Works natively with Zod, Valibot, ArkType schemas.
- bindField(element, field, options): Synchronizes input value, input events, blur validation, and manages aria-invalid, aria-describedby, aria-required automatically.
- Prototype Defense: Scrubs __proto__, constructor, and prototype during value setting.`,
    docUrl: '#docs'
  },

  // 6. ROUTER_AND_HTTP.md & @samrey/router + @samrey/http README
  {
    id: 'doc-router-http',
    title: 'Router & HTTP Data Fetching (@samrey/router & @samrey/http)',
    sourcePath: 'docs/ROUTER_AND_HTTP.md',
    category: 'router',
    headings: ['Reactive Routing (@samrey/router)', 'Defining Routes & Router Instance', 'Open-Redirect Protection', 'Reactive Data Fetching (@samrey/http)', 'createResource Primitive', 'HttpClient'],
    keywords: ['router', 'routing', 'createRouter', 'useParams', 'useLocation', 'useNavigate', 'Link', 'http', 'fetch', 'api', 'createResource', 'HttpClient', 'createHttpClient', 'resource', 'caching', 'sanitizeRedirectUri'],
    apis: ['createRouter', 'useParams', 'useLocation', 'useNavigate', 'Link', 'HttpClient', 'createHttpClient', 'createResource', 'resource', 'sanitizeRedirectUri'],
    errorCodes: ['SAMREY-401', 'SAMREY-402', 'SAMREY-403', 'SAMREY-601', 'SAMREY-602', 'SAMREY-603'],
    summary: 'Type-safe signal-driven router with parameterized route matching and open-redirect defense, paired with @samrey/http reactive resources and deduplicated HTTP fetching.',
    content: `# Router & HTTP in Samrey
1. @samrey/router:
- createRouter(routes, initialPath): Initializes client/server router.
- useParams(), useLocation(), useNavigate(): Reactive hooks for route state.
- Link: Type-safe navigation link component.
- Security: Automatically sanitizes redirect URLs with sanitizeRedirectUri, blocking protocol-relative and external exploits.

2. @samrey/http:
- createHttpClient({ baseUrl, headers, timeout }): Type-safe HTTP client with interceptors.
- createResource(sourceSignal, fetcherFn): Integrates async data fetching into the signal graph with data, loading, error, and refetch signals.`,
    docUrl: '#docs'
  },

  // 7. SSR_AND_HYDRATION.md & @samrey/ssr README
  {
    id: 'doc-ssr-hydration',
    title: 'Server-Side Rendering & Hydration (@samrey/ssr)',
    sourcePath: 'docs/SSR_AND_HYDRATION.md',
    category: 'ssr',
    headings: ['SSR & Hydration Overview', 'Direct Template Hoisting', 'Zero-Waterfall Data Hydration', 'Zero-Overhead Event Delegator', 'renderToString', 'renderToStream', 'hydrate', 'Secret Stripping'],
    keywords: ['ssr', 'hydration', 'server side rendering', 'renderToString', 'renderToStream', 'hydrate', 'createSSRContext', 'streaming', 'micro-hydration', 'secret stripping', 'stripSecrets', 'event delegation', 'state serialization'],
    apis: ['renderToString', 'renderToStream', 'hydrate', 'createSSRContext', 'stripSecrets', 'escapeJsonState', 'getDelegatedEventScript'],
    errorCodes: ['SAMREY-701', 'SAMREY-702', 'SAMREY-703', 'SAMREY-704'],
    summary: 'Isomorphic rendering engine supporting full HTML renderToString, chunked streaming renderToStream (Web Streams), pre-hydration micro-event replay, and automatic secret credential stripping.',
    content: `# SSR & Hydration Architecture (@samrey/ssr)
- renderToString(App, options): Renders component tree to full HTML string on server.
- renderToStream(App, options): Streams HTML chunks via ReadableStream<Uint8Array>.
- hydrate(App, container): Attaches reactive signals and event listeners to server HTML without full tree re-execution.
- State Serialization: Uses Unicode-escaped <script id="__SAMREY_STATE__"> preventing script breakouts.
- Secret Stripping: stripSecrets() automatically purges sensitive environment variables and tokens from client payload.`,
    docUrl: '#docs'
  },

  // 8. SECURITY_MODEL.md & SECURITY.md & @samrey/security README
  {
    id: 'doc-security-model',
    title: 'Security Architecture & Defense-in-Depth (@samrey/security)',
    sourcePath: 'docs/SECURITY_MODEL.md',
    category: 'security',
    headings: ['Executive Summary & Security Principles', 'Context-Aware Sanitization Pipeline', 'Trusted Types Enforcement', 'Zero-eval Guarantee', 'CSRF Protection', 'Prototype Pollution Defense'],
    keywords: ['security', 'xss', 'sanitizeHtml', 'sanitizeUri', 'sanitizeUrl', 'trusted types', 'zero eval', 'csrf', 'prototype pollution', 'safeJsonParse', 'escapeJsonState', 'csp', 'defense in depth'],
    apis: ['sanitizeHtml', 'sanitizeHtmlString', 'sanitizeUri', 'sanitizeUrl', 'sanitizeRedirectUri', 'sanitizeCssStyle', 'escapeForScriptPayload', 'serializeStateForHydration', 'escapeJsonState', 'safeJsonParse', 'generateCsrfToken', 'verifyCsrfToken', 'getSamreyTrustedPolicy', 'getSamreyTemplateTrustedPolicy'],
    errorCodes: ['SAMREY-201', 'SAMREY-202', 'SAMREY-203', 'SAMREY-204', 'SAMREY-205', 'SAMREY-502'],
    summary: 'Zero-trust architecture with context-aware sanitization (HTML, attributes, URIs, CSS), W3C Trusted Types, zero-eval runtime, timing-safe CSRF tokens, and prototype pollution scrubbing.',
    content: `# Security Architecture (@samrey/security)
- Zero-eval runtime: No eval() or new Function(). Full CSP script-src 'self' compatibility.
- sanitizeHtmlString(dirtyHtml) / sanitizeHtml(): Parses and strips malicious script tags, iframes, and inline onerror/onload handlers.
- sanitizeUri(url): Blocks javascript:, vbscript:, data:text/html schemes, returning 'about:blank'. Use sanitizeRedirectUri(url) for redirects.
- getSamreyTrustedPolicy() / getSamreyTemplateTrustedPolicy(): Registers samrey#html and samrey#template W3C Trusted Types policies.
- safeJsonParse(json): Deeply cleanses __proto__, constructor, and prototype overrides.
- CSRF Protection: generateCsrfToken() and timing-safe verifyCsrfToken().
- serializeStateForHydration() / escapeForScriptPayload(): Unicode-escapes SSR state payloads.`,
    docUrl: '#security'
  },

  // 9. MIGRATION_GUIDE.md & UPGRADE_GUIDE.md
  {
    id: 'doc-migration-guide',
    title: 'Migration Guide (React, SolidJS, Svelte to Samrey)',
    sourcePath: 'docs/MIGRATION_GUIDE.md',
    category: 'migration',
    headings: ['Migrating from React', 'Mental Model Shift', 'Comparison Table (React vs Samrey)', 'Migrating from SolidJS', 'Migrating from Svelte'],
    keywords: ['migration', 'react', 'solidjs', 'svelte', 'usestate', 'useeffect', 'usememo', 'usecallback', 'vdom', 'runes', 'comparison', 'mental model', 'upgrade'],
    apis: ['signal', 'computed', 'effect', 'Show', 'For', 'onCleanup'],
    errorCodes: [],
    summary: 'Step-by-step guidance for migrating applications from React, SolidJS, and Svelte to Samrey, including mental model shifts and exact API equivalence tables.',
    content: `# Migrating to Samrey v2.1.0
Mental Model: Components run ONCE. State updates directly mutate DOM nodes without re-running component functions.
- React useState(0) -> Samrey signal(0)
- React useMemo(() => ...) -> Samrey computed(() => ...)
- React useEffect(() => ...) -> Samrey effect(() => ...)
- React {isOpen ? <Modal /> : null} -> Samrey Show({ when: () => isOpen.value, children: () => Modal() })
- React {items.map(...)} -> Samrey For({ each: () => items.value, key: i => i.id, children: (item) => ... })
- React useEffect cleanup -> Samrey onCleanup(() => ...)`,
    docUrl: '#docs'
  },

  // 10. GETTING_STARTED.md & @samrey/cli README
  {
    id: 'doc-getting-started',
    title: 'Getting Started & CLI Tooling (@samrey/cli)',
    sourcePath: 'docs/GETTING_STARTED.md',
    category: 'cli',
    headings: ['Creating a New Project', 'Starter Templates (ssr, spa, minimal, ssg)', 'Development Scripts', 'Core Mental Model'],
    keywords: ['getting started', 'cli', 'samrey create', 'templates', 'ssr', 'spa', 'minimal', 'ssg', 'npm run dev', 'build', 'scaffolding', 'tooling'],
    apis: ['create', 'dev', 'build', 'preview', 'test', 'audit', 'analyze', 'generate'],
    errorCodes: ['SAMREY-001', 'SAMREY-002', 'SAMREY-003', 'SAMREY-004', 'SAMREY-005'],
    summary: 'Quick start guide for creating new Samrey projects with the CLI, choosing templates (SSR, SPA, Minimal, SSG), and understanding the zero-VDOM mental model.',
    content: `# Getting Started with Samrey (@samrey/cli)
- samrey create my-app --template ssr (Server-Side Rendering starter)
- samrey create my-app --template spa (Single-Page Application starter)
- samrey create my-app --template minimal (Lightweight zero-config starter)
- samrey create my-app --template ssg (Static Site Generation starter)

Available scripts:
- npm run dev: Start dev server with Hot Module Replacement & DevTools
- npm run build: Production compilation
- npm run test: Execute test harness
- npm run audit: Security and accessibility audit`,
    docUrl: '#docs'
  },

  // 11. TESTING_AND_TOOLING.md & @samrey/testing README
  {
    id: 'doc-testing-tooling',
    title: 'Testing & Quality Assurance (@samrey/testing)',
    sourcePath: 'docs/TESTING_AND_TOOLING.md',
    category: 'testing',
    headings: ['Headless Test Harness', 'Simulating User Events', 'Reactive Assertions', 'Testing Components & Stores'],
    keywords: ['testing', 'renderTest', 'renderTestComponent', 'fireEvent', 'flushReactivity', 'waitFor', 'assertions', 'unit tests', 'integration tests', 'mock dom'],
    apis: ['renderTest', 'renderTestComponent', 'fireEvent', 'flushReactivity', 'waitFor', 'cleanupAllTestContainers'],
    errorCodes: ['SAMREY-801', 'SAMREY-802', 'SAMREY-803'],
    summary: 'Headless reactive test harness for asserting signal updates, simulated user events (click, input, submit), and component lifecycle validation without heavy browser runners.',
    content: `# Testing Samrey Applications (@samrey/testing)
- renderTest(component): Mounts a component into an isolated container with reactive root cleanup.
- fireEvent(target, eventName): Simulates click, input, change, submit, and keyboard events on DOM nodes.
- flushReactivity(): Flushes pending microtask reactivity updates cleanly in async tests.`,
    docUrl: '#docs'
  },

  // 12. COMPETITIVE_ANALYSIS.md
  {
    id: 'doc-competitive-analysis',
    title: 'Competitive Technical Analysis & Framework Taxonomy',
    sourcePath: 'docs/COMPETITIVE_ANALYSIS.md',
    category: 'general',
    headings: ['Classification Methodology (Taxonomy A-F)', '22-Dimension Multi-Framework Comparative Matrix', 'Key Architectural Learnings'],
    keywords: ['competitive analysis', 'comparison', 'react', 'angular', 'vue', 'svelte', 'solid', 'virtual dom', 'benchmark', 'taxonomy', 'zero vdom', 'fine-grained'],
    apis: [],
    errorCodes: [],
    summary: 'Exhaustive 22-dimension technical evaluation of React, Angular, Vue, Svelte, and Solid with rigorous Category A-F taxonomy and rationale for Samrey\'s zero-VDOM architecture.',
    content: `# Competitive Technical Analysis
Evaluates React, Angular, Vue, Svelte, Solid across 22 architectural dimensions:
1. Rendering Architecture: Samrey uses static <template> clone hoisting with fine-grained DOM slot bindings (no VDOM).
2. Reactivity Model: Push-pull topological signals with versioned transaction clocks.
3. Security: Context-aware auto-sanitizing compiler + Trusted Types + Zero-eval runtime.
4. Hydration: Resumable micro-hydration with pre-hydration event delegation.`,
    docUrl: '#competitive'
  },

  // 13. EXAMPLES/README.md & Starter Templates
  {
    id: 'doc-examples-catalog',
    title: 'Runnable Examples & Starter Templates Catalog',
    sourcePath: 'examples/README.md',
    category: 'examples',
    headings: ['Runnable Verified Examples', 'Starter Templates Catalog', 'Basic Counter', 'Schema Form', 'HTTP Resource', 'Routing & Guards', 'SSR & Streaming'],
    keywords: ['examples', 'starter templates', 'basic-counter', 'schema-form', 'http', 'routing', 'ssr', 'streaming-ssr', 'hydration', 'ssg', 'project-manager', 'task-details-app', 'code samples'],
    apis: ['signal', 'createForm', 'createRouter', 'createHttpClient', 'renderToString', 'renderToStream'],
    errorCodes: [],
    summary: 'Complete collection of verified, runnable examples demonstrating reactive state, schema forms, HTTP resources, type-safe routing, SSR streaming, and full applications.',
    content: `# Samrey Runnable Examples & Starters
1. basic-counter: Fine-grained reactive signal state without Virtual DOM.
2. routing: Declarative routing with parameterized segments and open-redirect sanitization.
3. schema-form: Standard Schema validated form with auto-ARIA bindings.
4. http: Reactive async resource data fetching (createResource) with request deduplication.
5. ssr: Full isomorphic server rendering with head metadata and hydration.
6. streaming-ssr: Chunked HTML streaming via Web Streams API.
7. project-manager: Full CRUD project management app with reactive stores and filters.
8. task-details-app: Enterprise task tracking with custom form validators and status workflows.`,
    docUrl: '#docs'
  }
];
