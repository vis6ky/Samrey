import { ADR } from '../types';

export const ARCHITECTURE_DECISION_RECORDS: ADR[] = [
  {
    id: 'ADR-001',
    title: 'Fine-Grained Push-Pull Signals vs. Virtual DOM Reconciliation',
    status: 'Accepted',
    category: 'Core Architecture',
    context: 'React-style VDOM diffing requires continuous memory allocation for virtual node trees, triggers recursive re-renders of child components, and mandates complex manual memoization (useMemo/useCallback).',
    decision: 'Aether adopts a Fine-Grained Push-Pull Signal Graph where component functions execute ONCE during initialization to construct the reactive graph. Signals update target DOM nodes directly with zero VDOM overhead.',
    consequences: {
      positive: [
        'Eliminates stale closures, hook rules, and dependency arrays',
        'O(1) update speed proportional strictly to changed values, not component tree size',
        'Reduces core runtime bundle size by >40 kB by omitting the VDOM diffing engine'
      ],
      negative: [
        'Destructuring reactive state without getters detaches reactivity (compiler provides diagnostics to guide developers)'
      ]
    },
    alternatives: ['Virtual DOM with Fiber Reconciler', 'Compiler-driven dirty checking loops (Zone.js)']
  },
  {
    id: 'ADR-002',
    title: 'Static Template Cloning via HTML <template> Elements',
    status: 'Accepted',
    category: 'DOM Rendering Engine',
    context: 'Creating DOM elements imperatively via document.createElement() in JavaScript loops is significantly slower than cloning pre-parsed HTML fragments in browser C++ engines.',
    decision: 'The Aether compiler will extract all static HTML subtrees into module-scoped <template> elements and emit native cloneNode(true) calls with direct sibling traversal paths for dynamic slot patching.',
    consequences: {
      positive: [
        '3x to 5x faster initial mount throughput compared to sequential JS DOM creation calls',
        'Extremely compact compiled code with minimal JS heap overhead'
      ],
      negative: [
        'Mandates a dedicated AOT compilation build step (Vite/Rollup)'
      ]
    },
    alternatives: ['Sequential document.createElement() instructions (Ivy/React)', 'Pure string-based innerHTML replacement']
  },
  {
    id: 'ADR-003',
    title: 'Zero-eval Runtime & Mandatory Trusted Types Enforcement',
    status: 'Accepted',
    category: 'Security Architecture',
    context: 'In-browser dynamic expression compilation with new Function() or eval() introduces critical XSS attack vectors and violates strict enterprise Content Security Policies (script-src self).',
    decision: 'Aether core packages strictly forbid any usage of eval(), new Function(), or dynamic script tag execution. All expressions are compiled Ahead-of-Time. Dynamic HTML rendering is restricted to an explicit <SafeHtml> component backed by a cryptographically sealed Trusted Types policy.',
    consequences: {
      positive: [
        'Full compatibility with strict Content Security Policy without unsafe-eval or unsafe-inline',
        'Zero risk of template injection XSS attacks'
      ],
      negative: [
        'In-browser dynamic template evaluation without a build step is unsupported by design'
      ]
    },
    alternatives: ['Runtime template compiler with regex sanitization', 'Unchecked innerHTML property bindings']
  },
  {
    id: 'ADR-004',
    title: 'Standard Schema Specification for Built-In Form Validation',
    status: 'Accepted',
    category: 'Form Management',
    context: 'Form validation in modern TypeScript is fragmented across Zod, Valibot, ArkType, and Yup. Proprietary validation syntax introduces redundant learning curves and vendor lock-in.',
    decision: 'Aether forms natively implement the Standard Schema Specification (~standard). Any schema from Zod v3.24+, Valibot v1+, or ArkType works out-of-the-box with full TypeScript inference, automatic aria-invalid bindings, and async action validation.',
    consequences: {
      positive: [
        'Zero vendor lock-in and instant compatibility with existing enterprise schema libraries',
        'Enables zero-runtime-validation overhead when paired with ultra-light validators like Valibot'
      ],
      negative: [
        'Requires schema authors to use modern Standard Schema-compliant versions'
      ]
    },
    alternatives: ['Custom proprietary validation DSL', 'Un-typed string-based validator rules']
  },
  {
    id: 'ADR-005',
    title: 'Out-of-Order HTML Streaming with Resumable Micro-Hydration',
    status: 'Accepted',
    category: 'SSR & Hydration',
    context: 'Traditional SSR hydration forces the browser to download the full JS bundle, re-execute the entire component hierarchy, and build an in-memory VDOM before attaching event listeners, causing the "Uncanny Valley".',
    decision: 'Aether implements Out-of-Order Streaming SSR combined with Resumable Micro-Hydration. A 200-byte root listener delegates events immediately, and components resume from serialized Unicode JSON payloads without re-executing initialization logic.',
    consequences: {
      positive: [
        'Near-zero Time-to-Interactive (TTI); user interactions during loading are buffered and replayed without dropped clicks',
        'Eliminates double execution of component constructor logic on client startup'
      ],
      negative: [
        'Server host environment must support streaming responses (Node.js Streams, Web Streams, or Edge runtimes)'
      ]
    },
    alternatives: ['Full VDOM client-side tree hydration (React/Vue)', 'Islands architecture with isolated bundle downloads']
  },
  {
    id: 'ADR-006',
    title: 'Monorepo Package Topology with Strict Acyclic Dependency Boundaries',
    status: 'Accepted',
    category: 'Repository Architecture',
    context: 'Monolithic frameworks bloat client bundles and introduce circular dependencies that hinder tree-shaking and independent package versioning.',
    decision: 'Aether is structured as a monorepo of 12 distinct packages organized in a strict Directed Acyclic Graph (DAG). Foundational packages (@aether/reactivity, @aether/security) have zero internal dependencies.',
    consequences: {
      positive: [
        'Enables high tree-shakeability; applications only pay bundle cost for the packages they import',
        'Enforces clean architectural boundaries and prevents tight coupling'
      ],
      negative: [
        'Requires monorepo tooling (Turborepo/pnpm workspaces) and coordinated version release pipelines'
      ]
    },
    alternatives: ['Monolithic single-package distribution', 'Uncoordinated multi-repository architecture']
  },
  {
    id: 'ADR-007',
    title: 'Explicit Asynchronous Resource Signals over Side-Effect Hooks',
    status: 'Accepted',
    category: 'Data Fetching',
    context: 'Using React useEffect for data fetching causes request waterfalls, race conditions, forgotten AbortControllers, and complex loading state coordination.',
    decision: 'Aether provides first-class createResource() and route-level loader() primitives with built-in status flags (idle, pending, success, error), request deduplication, and automatic AbortController lifecycle management.',
    consequences: {
      positive: [
        'Guaranteed cancellation of stale network requests when component scopes unmount',
        'Zero race conditions and automatic caching with tag-based invalidation'
      ],
      negative: [
        'Requires developers to shift from procedural useEffect triggers to declarative resource bindings'
      ]
    },
    alternatives: ['Procedural lifecycle hooks (onMount + fetch)', 'External state store middleware (Redux Thunk/Saga)']
  },
  {
    id: 'ADR-008',
    title: 'Compile-Time A11y and Context-Aware Security Verification',
    status: 'Accepted',
    category: 'Compiler & Verification',
    context: 'Accessibility flaws and XSS vulnerabilities are often discovered late in production audits rather than during the development feedback loop.',
    decision: 'The @aether/compiler statically verifies WAI-ARIA authoring practices, missing alt attributes, unsafe URL protocols in href/src, and unescaped HTML injections at build-time with immediate IDE diagnostics.',
    consequences: {
      positive: [
        'Prevents common accessibility and security regressions before code can be committed or deployed',
        'Zero runtime CPU cost for static validation'
      ],
      negative: [
        'Increases compiler build-time analysis overhead slightly (<5% in benchmarks)'
      ]
    },
    alternatives: ['Post-build ESLint plugin rules only', 'Runtime console warning checks in development mode']
  }
];
