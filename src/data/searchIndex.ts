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
    apis: ['signal', 'computed', 'effect', 'batch', 'untrack', 'createStore', 'produce', 'reconcile', 'createMemo', 'createRoot', 'getOwner', 'runWithOwner', 'onCleanup', 'createContext', 'useContext', 'el', 'svg', 'fragment', 'mount', 'hydrate', 'Show', 'For', 'Switch', 'Match', 'Dynamic', 'ErrorBoundary', 'compile', 'parse', 'transform', 'sanitizeHtml', 'sanitizeUri', 'sanitizeUrl', 'escapeJsonState', 'safeJsonParse', 'generateCsrfToken', 'validateCsrfToken', 'createRouter', 'useParams', 'useLocation', 'useNavigate', 'Link', 'createForm', 'createField', 'bindField', 'HttpClient', 'createHttpClient', 'createResource', 'resource', 'renderToString', 'renderToStream', 'testHarness', 'fireEvent'],
    errorCodes: [],
    summary: 'Authoritative Public API contract for all 11 packages in Samrey v1.0.0. Details every public function, type interface, and usage target.',
    content: `# Samrey Framework — Public API Authoritative Reference
Contract for all 11 packages comprising the Samrey Framework:
1. @samrey/reactivity: signal, computed, effect, batch, untrack, createStore, produce, reconcile, createMemo, createRoot, getOwner, runWithOwner, onCleanup, createContext, useContext.
2. @samrey/runtime: el, svg, fragment, mount, hydrate, Show, For, Switch, Match, Dynamic, ErrorBoundary.
3. @samrey/compiler: compile, parse, transform, generateStaticTemplate, optimizeAst.
4. @samrey/security: sanitizeHtml, sanitizeUri, sanitizeUrl, escapeJsonState, safeJsonParse, generateCsrfToken, validateCsrfToken, createTrustedTypePolicy.
5. @samrey/router: createRouter, useParams, useLocation, useNavigate, Link, Router, Route.
6. @samrey/forms: createForm, createField, bindField, validateStandardSchema.
7. @samrey/http: HttpClient, createHttpClient, createResource, resource.
8. @samrey/ssr: renderToString, renderToStream, hydrate, createSSRContext, stripSecrets.
9. @samrey/testing: testHarness, createTestHarness, fireEvent, renderIntoDocument.
10. @samrey/devtools: createDevToolsBridge, inspectSignalGraph, timeTravelState.
11. @samrey/cli: create, dev, build, preview, test, audit, analyze, generate.`,
    docUrl: '#architecture'
  },

  // 2. ERROR_CODES.md
  {
    id: 'doc-error-codes',
    title: 'Deterministic Error Codes Reference (AETH-xxx)',
    sourcePath: 'docs/ERROR_CODES.md',
    category: 'errors',
    headings: ['CLI & Tooling (AETH-001 - AETH-099)', 'Compiler & Parsing (AETH-101 - AETH-199)', 'Security & A11y (AETH-201 - AETH-299)', 'Reactivity & Runtime (AETH-301 - AETH-399)', 'Router & Navigation (AETH-401 - AETH-499)', 'Forms & Validation (AETH-501 - AETH-599)', 'HTTP & Data Fetching (AETH-601 - AETH-699)', 'SSR & Hydration (AETH-701 - AETH-799)', 'DevTools & Testing (AETH-801 - AETH-899)'],
    keywords: ['error codes', 'aeth', 'diagnostics', 'troubleshooting', 'error handling', 'aeth-101', 'aeth-201', 'aeth-301', 'aeth-401', 'aeth-501', 'aeth-601', 'aeth-701', 'aeth-801', 'recovery', 'stack trace'],
    apis: ['AetherError', 'formatErrorMessage'],
    errorCodes: ['AETH-001', 'AETH-002', 'AETH-003', 'AETH-004', 'AETH-005', 'AETH-101', 'AETH-102', 'AETH-103', 'AETH-104', 'AETH-105', 'AETH-106', 'AETH-201', 'AETH-202', 'AETH-203', 'AETH-204', 'AETH-205', 'AETH-301', 'AETH-302', 'AETH-303', 'AETH-304', 'AETH-305', 'AETH-306', 'AETH-401', 'AETH-402', 'AETH-403', 'AETH-404', 'AETH-501', 'AETH-502', 'AETH-503', 'AETH-504', 'AETH-601', 'AETH-602', 'AETH-603', 'AETH-604', 'AETH-701', 'AETH-702', 'AETH-703', 'AETH-704', 'AETH-705', 'AETH-801', 'AETH-802', 'AETH-803'],
    summary: 'Complete diagnostic error code catalog from AETH-001 to AETH-899 with exact root-cause analysis and recovery suggestions.',
    content: `# Samrey Error Codes Catalog (AETH-xxx)
- AETH-101: Template Syntax Error. Unclosed tag or invalid JSX/template expression. Fix: ensure matching tags.
- AETH-102: Forbidden Dynamic Evaluation. Use of eval() or dynamic Function() detected at compile time.
- AETH-201: Insecure URI Protocol. Detected javascript: or vbscript: protocol in href/src. Fix: use safe URL.
- AETH-202: Unescaped Raw HTML Injection. Dynamic string passed to innerHTML without Trusted Type sanitization. Fix: use sanitizeHtml().
- AETH-203: Missing Accessibility Label. Interactive element missing aria-label or accessible text.
- AETH-301: Circular Dependency in Computed Signal. A computed signal reads a value that directly depends on itself. Fix: break cycle with untrack().
- AETH-302: Signal Mutation Inside Pure Derivation. Attempted to mutate a signal inside a computed() or memoized getter.
- AETH-303: Missing Key in <For> Control Flow. <For> collection missing unique key extractor function.
- AETH-401: Unmatched Route Path. Navigation to a route path with no registered handler or 404 fallback.
- AETH-402: Invalid Route Parameter Definition. Route parameter missing name or contains illegal characters.
- AETH-501: Form Schema Validation Failure. Field value violates Standard Schema (Zod/Valibot) constraint.
- AETH-502: Missing CSRF Token in Form Submission. Form submitted without required CSRF verification token.
- AETH-601: HTTP Network Timeout. Request exceeded configured timeout threshold. Fix: check network or retry with backoff.
- AETH-602: Invalid HTTP Response Status (4xx/5xx). Server returned an unhandled HTTP error code.
- AETH-701: SSR Hydration Mismatch. Server markup differs structurally from client initial render. Fix: avoid non-deterministic browser APIs during SSR.
- AETH-702: Secret Leakage in SSR State. Server environment variable or secret credential detected in client serialization payload. Fix: use stripSecrets().`,
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
    errorCodes: ['AETH-301', 'AETH-302'],
    summary: 'Fine-grained push-pull topological signal engine with monotonic transaction clock, automatic batching, deep reactive proxy stores, and Owner memory disposal.',
    content: `# Reactivity & State in Samrey (@samrey/reactivity)
Samrey uses a topological push-pull signal graph. Components run ONCE during setup.
- signal(initialValue): Creates a read-write reactive atom. Read via .value (or peek()), mutate via .value = next.
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
    errorCodes: ['AETH-303'],
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
    apis: ['createForm', 'createField', 'bindField', 'validateStandardSchema'],
    errorCodes: ['AETH-501', 'AETH-502', 'AETH-503', 'AETH-504'],
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
    errorCodes: ['AETH-401', 'AETH-402', 'AETH-403', 'AETH-601', 'AETH-602', 'AETH-603'],
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
    errorCodes: ['AETH-701', 'AETH-702', 'AETH-703', 'AETH-704'],
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
    apis: ['sanitizeHtml', 'sanitizeUri', 'sanitizeUrl', 'escapeJsonState', 'safeJsonParse', 'generateCsrfToken', 'validateCsrfToken', 'createTrustedTypePolicy'],
    errorCodes: ['AETH-201', 'AETH-202', 'AETH-203', 'AETH-204', 'AETH-205', 'AETH-502'],
    summary: 'Zero-trust architecture with context-aware sanitization (HTML, attributes, URIs, CSS), W3C Trusted Types, zero-eval runtime, timing-safe CSRF tokens, and prototype pollution scrubbing.',
    content: `# Security Architecture (@samrey/security)
- Zero-eval runtime: No eval() or new Function(). Full CSP script-src 'self' compatibility.
- sanitizeHtml(dirtyHtml): Parses and strips malicious script tags, iframes, and inline onerror/onload handlers.
- sanitizeUri(url): Blocks javascript:, vbscript:, data:text/html schemes, returning safe fallback.
- safeJsonParse(json): Deeply cleanses __proto__, constructor, and prototype overrides.
- CSRF Protection: generateCsrfToken() and timing-safe validateCsrfToken().
- escapeJsonState(data): Unicode-escapes SSR state payloads.`,
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
    content: `# Migrating to Samrey v1.0.0
Mental Model: Components run ONCE. State updates directly mutate DOM nodes without re-running component functions.
- React useState(0) -> Samrey signal(0)
- React useMemo(() => ...) -> Samrey computed(() => ...)
- React useEffect(() => ...) -> Samrey effect(() => ...)
- React {isOpen ? <Modal /> : null} -> Samrey <Show when={() => isOpen.value}><Modal /></Show>
- React {items.map(...)} -> Samrey <For each={() => items.value} key={i => i.id}>{i => ...}</For>
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
    errorCodes: ['AETH-001', 'AETH-002', 'AETH-003', 'AETH-004', 'AETH-005'],
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
    keywords: ['testing', 'test harness', 'testHarness', 'createTestHarness', 'fireEvent', 'assertions', 'unit tests', 'integration tests', 'mock dom'],
    apis: ['testHarness', 'createTestHarness', 'fireEvent', 'renderIntoDocument'],
    errorCodes: ['AETH-801', 'AETH-802', 'AETH-803'],
    summary: 'Headless reactive test harness for asserting signal updates, simulated user events (click, input, submit), and component lifecycle validation without heavy browser runners.',
    content: `# Testing Samrey Applications (@samrey/testing)
- createTestHarness(): Creates an isolated DOM environment with reactive root and automatic cleanup.
- fireEvent: Simulates click, input, change, submit, and keyboard events on native DOM nodes.
- Synchronous testing: Because Samrey reactivity is synchronous and glitch-free, assertions run immediately after state mutations or simulated events without arbitrary waitFor delays.`,
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
