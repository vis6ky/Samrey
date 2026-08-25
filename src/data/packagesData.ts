import { FrameworkPackage } from '../types';

export const FRAMEWORK_PACKAGES: FrameworkPackage[] = [
  {
    name: '@samrey/reactivity',
    scope: 'Core Reactive Engine',
    description: 'Foundational push-pull topological signal graph with versioned transaction clocks and Owner-based memory disposal.',
    bundleBudget: '< 2.2 kB min+gzip',
    dependencies: [],
    keyExports: ['signal', 'computed', 'effect', 'batch', 'untrack', 'onCleanup', 'createScope', 'createOwner'],
    responsibilities: [
      'Glitch-free push-pull dependency resolution',
      'Transaction clock versioning (O(1) dirty checking)',
      'Diamond dependency prevention without redundant evaluations',
      'Automatic memory cleanup on scope unmount'
    ],
    securityBoundary: 'Zero DOM access, zero eval/Function execution. Internal subscriber records use Object.create(null).'
  },
  {
    name: '@samrey/runtime',
    scope: 'Component & DOM Engine',
    description: 'Instantiates single-execution components, clones pre-parsed static <template> elements, and surgically binds reactive updates.',
    bundleBudget: '< 4.5 kB min+gzip',
    dependencies: ['@samrey/reactivity', '@samrey/security'],
    keyExports: ['template', 'bindText', 'bindAttr', 'bindClass', 'on', 'Show', 'For', 'Switch', 'Suspense', 'createContext'],
    responsibilities: [
      'Static HTML template cloning via cloneNode(true)',
      'Direct node pointer caching and surgical hole updates',
      'Root event delegation listener (200 bytes)',
      'Scoped cleanup integration with reactivity Owner tree'
    ],
    securityBoundary: 'Sanitizes all attribute bindings through @samrey/security. Enforces strict URI scheme whitelist on href/src.'
  },
  {
    name: '@samrey/compiler',
    scope: 'AOT Compiler & AST Pipeline',
    description: 'Parses TSX/template code, constructs the Samrey Intermediate Representation (AIR), validates security contexts, and generates optimized direct DOM JS.',
    bundleBudget: 'Build-time only (0 kB runtime)',
    dependencies: ['@samrey/security'],
    keyExports: ['compile', 'parseAIR', 'transformJSX', 'lintA11y', 'classifySecurityContext'],
    responsibilities: [
      'TSX parsing and semantic dependency extraction',
      'Static template string hoisting to module level',
      'Compile-time accessibility (a11y) linting (ARIA roles, alt tags)',
      'Security context classification (HTML, Attr, URI, CSS)'
    ],
    securityBoundary: 'Rejects insecure inline expressions, blocks javascript: URLs at compile-time, and forces Trusted Types on dynamic HTML.'
  },
  {
    name: '@samrey/router',
    scope: 'Type-Safe Routing',
    description: 'Universal file-based and code-based router with nested layout caching, streaming data loaders, and automatic prefetching.',
    bundleBudget: '< 3.8 kB min+gzip',
    dependencies: ['@samrey/reactivity', '@samrey/runtime'],
    keyExports: ['Router', 'Route', 'Link', 'useParams', 'useNavigate', 'useLoaderData', 'createFileRoute'],
    responsibilities: [
      'Hierarchical nested route matching with persistent layouts',
      'Parallel streaming data loaders',
      'Viewport and hover prefetching of route chunks and data',
      'Document View Transitions API orchestration'
    ],
    securityBoundary: 'Validates route params against prototype injection; sanitizes navigation targets against open redirect attacks.'
  },
  {
    name: '@samrey/http',
    scope: 'Data Fetching & Caching',
    description: 'Type-safe HTTP client with reactive resource signals, request deduplication, cache invalidation, and automatic AbortController lifecycle.',
    bundleBudget: '< 2.5 kB min+gzip',
    dependencies: ['@samrey/reactivity'],
    keyExports: ['createResource', 'http', 'useMutation', 'invalidateTags', 'fetchStream'],
    responsibilities: [
      'Resource signal abstraction ({ data, loading, error, refetch })',
      'Concurrent request deduplication',
      'Tag-based cache invalidation linked to router actions',
      'Automatic AbortController triggering on component unmount'
    ],
    securityBoundary: 'Strips sensitive auth headers on cross-origin requests; enforces default security headers (nosniff, strict-origin).'
  },
  {
    name: '@samrey/forms',
    scope: 'Schema-Driven Forms',
    description: 'First-class form validation engine supporting the Standard Schema specification (Zod, Valibot, ArkType) with auto-derived ARIA bindings.',
    bundleBudget: '< 2.8 kB min+gzip',
    dependencies: ['@samrey/reactivity', '@samrey/runtime'],
    keyExports: ['createForm', 'Field', 'useField', 'FormAction', 'validateSchema'],
    responsibilities: [
      'Standard Schema (~standard) compliance with zero custom adapters',
      'Automatic aria-invalid and aria-describedby wiring',
      'Progressive enhancement support for standard POST actions',
      'Sub-field dirty tracking and async validation debouncing'
    ],
    securityBoundary: 'Built-in CSRF token integration; HMAC verification for server action endpoints.'
  },
  {
    name: '@samrey/ssr',
    scope: 'Streaming & Resumable Hydration',
    description: 'High-throughput streaming HTML generator with out-of-order chunk swapping and safe Unicode JSON state serialization.',
    bundleBudget: '< 3.2 kB min+gzip',
    dependencies: ['@samrey/reactivity', '@samrey/security'],
    keyExports: ['renderToStream', 'renderToString', 'serializeForHydration', 'createEventDelegatorScript'],
    responsibilities: [
      'Out-of-order HTML chunk streaming via <template> swaps',
      'Safe Unicode state serialization immune to script breakout',
      'Early interaction event recording script emission',
      'Resumable client state hydration without re-running component functions'
    ],
    securityBoundary: 'Mandatory Unicode escaping of <, >, &, \\u2028, and \\u2029 in serialized script blocks.'
  },
  {
    name: '@samrey/security',
    scope: 'Security & Sanitization',
    description: 'Contextual HTML/URI sanitizer, W3C Trusted Types policy provider, CSP nonce utilities, and anti-CSRF token helpers.',
    bundleBudget: '< 1.8 kB min+gzip',
    dependencies: [],
    keyExports: ['sanitizeUri', 'sanitizeHtmlString', 'getSamreyTrustedPolicy', 'SafeHtml', 'generateCsrfToken'],
    responsibilities: [
      'W3C Trusted Types policy management (aether#html)',
      'Contextual URI scheme validation (HTTP/S/mailto/tel only)',
      'Zero-eval runtime enforcement',
      'AST-based HTML element and attribute whitelist sanitization'
    ],
    securityBoundary: 'Acts as the central security verification layer for runtime, compiler, and SSR packages.'
  },
  {
    name: '@samrey/testing',
    scope: 'Headless Testing Harness',
    description: 'Lightweight reactive test runner with headless DOM mocking, signal assertion helpers, and memory leak detection tools.',
    bundleBudget: 'Dev/Test only',
    dependencies: ['@samrey/reactivity', '@samrey/runtime'],
    keyExports: ['renderTest', 'fireEvent', 'screen', 'flushReactivity', 'assertNoLeaks'],
    responsibilities: [
      'Microtask flush and signal settle assertions',
      'Headless DOM event dispatch and snapshot-free behavioral testing',
      'Automated memory leak detection using FinalizationRegistry'
    ],
    securityBoundary: 'Runs tests in isolated scopes with mock security policies.'
  },
  {
    name: '@samrey/cli',
    scope: 'Build Tooling & Scaffolder',
    description: 'Vite, Rollup, and esbuild plugins, file-system route typegen, project starter generator, and static security linter.',
    bundleBudget: 'CLI / Node.js only',
    dependencies: ['@samrey/compiler'],
    keyExports: ['vitePluginSamrey', 'createSamreyApp', 'auditSecurity', 'generateRouteTypes'],
    responsibilities: [
      'Zero-config bundler plugin integration',
      'Compile-time security and accessibility CLI audits (aether audit)',
      'Automatic TypeScript definition generation for file routes'
    ],
    securityBoundary: 'Validates template sources against known XSS signatures and misconfigured security headers.'
  },
  {
    name: '@samrey/devtools',
    scope: 'Visual Debugger & Inspector',
    description: 'Browser extension and in-page inspector for visual reactive graph inspection, computation timing profiling, and time-travel state debugging.',
    bundleBudget: '< 5 kB in dev; 0 kB in prod',
    dependencies: ['@samrey/reactivity'],
    keyExports: ['initDevtools', 'inspectGraph', 'timeTravelState', 'recordTransaction'],
    responsibilities: [
      'Real-time visualization of signal-to-computed-to-effect edges',
      'Computation latency profiler with flamegraph telemetry',
      'Time-travel state rollback and snapshot replay'
    ],
    securityBoundary: 'Completely stripped in production builds; uses structured origin-checked postMessage channels.'
  }
];
