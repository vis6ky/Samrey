import { DeferredFeature, RoadmapPhase } from '../types';

export const ROADMAP_PHASES: RoadmapPhase[] = [
  {
    phaseNumber: 0,
    name: 'Specification, Threat Modeling & Architectural Baselines',
    duration: 'M1 (Completed)',
    status: 'Completed',
    objectives: [
      'Comprehensive technical analysis of React, Angular, Vue, Svelte, and Solid',
      'Categorize all known architectural limitations and security attack vectors',
      'Formulate Core Tenets, Monorepo package topology, and Dependency DAG',
      'Publish ADR-001 through ADR-008 and formal Threat Model'
    ],
    verificationGate: [
      'All 5 formal documentation deliverables approved without internal contradictions',
      'Complete package dependency graph verified as strictly acyclic',
      'Security threat model signed off with zero-eval guarantee'
    ],
    deliverablePackages: ['Documentation Suite (docs/*.md)']
  },
  {
    phaseNumber: 1,
    name: 'Core Reactivity Engine & Standalone DOM Renderer',
    duration: 'M2 - M3',
    status: 'Ready to Start',
    objectives: [
      'Implement push-pull Signal graph with versioned transaction clocks',
      'Implement signal(), computed(), effect(), batch(), untrack(), and onCleanup()',
      'Build Owner-based automatic memory disposal hierarchy',
      'Implement static <template> cloning helper and fine-grained DOM hole binders'
    ],
    verificationGate: [
      '100% unit test coverage for reactivity primitives',
      'Zero memory leaks verified via automated heap allocation tests',
      'Diamond Dependency resolution passes with zero duplicate computations'
    ],
    deliverablePackages: ['@samrey/reactivity', '@samrey/runtime', '@samrey/security']
  },
  {
    phaseNumber: 2,
    name: 'Compiler Pipeline, AIR Representation & Codegen',
    duration: 'M3 - M4',
    status: 'Planned',
    objectives: [
      'Implement TSX/JSX parser and AST traversal engine',
      'Define and validate Samrey Intermediate Representation (AIR) schema',
      'Implement static HTML hoisting and <template> extraction',
      'Implement context-aware security classifier and compile-time A11y linter',
      'Create vite-plugin-samrey'
    ],
    verificationGate: [
      'Compile 50+ diverse test fixtures with bit-for-bit verified code output',
      'Compile-time rejection of javascript: URLs and unescaped HTML injection'
    ],
    deliverablePackages: ['@samrey/compiler', '@samrey/cli']
  },
  {
    phaseNumber: 3,
    name: 'Component Model, Runtime Lifecycle & Scoped Control Flow',
    duration: 'M4 - M5',
    status: 'Planned',
    objectives: [
      'Implement single-execution component instantiator',
      'Implement <Show>, <For>, <Switch>, and <Suspense> control flow components',
      'Implement Context API (createContext, useContext) backed by Owner trees',
      'Implement Error Boundaries (ErrorBoundary) for reactive error recovery'
    ],
    verificationGate: [
      'Verify components execute root function exactly once on state mutations',
      'Reconciliation test suite passes for dynamic list mutations (insert, delete, swap)'
    ],
    deliverablePackages: ['@samrey/runtime (v1.0)']
  },
  {
    phaseNumber: 4,
    name: 'SSR Streaming Engine, Serialization & Resumable Hydration',
    duration: 'M5 - M6',
    status: 'Planned',
    objectives: [
      'Implement asynchronous HTML streaming renderer for Node.js and Web Streams',
      'Implement Out-of-Order HTML stream chunks using hidden <template> swap blocks',
      'Implement safe Unicode JSON state serializer (window.__SAMREY_STATE__)',
      'Implement 200-byte root event delegation listener with event buffering'
    ],
    verificationGate: [
      'Zero XSS vulnerabilities on hostile string serialization payloads',
      'Sub-50ms Time-To-Interactive (TTI) verified on simulated 3G network'
    ],
    deliverablePackages: ['@samrey/ssr']
  },
  {
    phaseNumber: 5,
    name: 'Type-Safe Router, Data Fetching & Standard-Schema Forms',
    duration: 'M6 - M7',
    status: 'Planned',
    objectives: [
      'Implement file-based and code-based route matching with typed parameters',
      'Implement parallel nested route data loaders and automatic link prefetching',
      'Implement @samrey/http client with resource signals and auto-cancellation',
      'Implement @samrey/forms with Standard Schema (Zod/Valibot) validation'
    ],
    verificationGate: [
      'Seamless client-side navigation with zero layout flickering',
      'Form validation correctly sets aria-invalid and handles async server actions'
    ],
    deliverablePackages: ['@samrey/router', '@samrey/http', '@samrey/forms']
  },
  {
    phaseNumber: 6,
    name: 'DevTools Bridge, Profiler & Testing Harness',
    duration: 'M7 - M8',
    status: 'Planned',
    objectives: [
      'Build browser DevTools extension for real-time signal graph inspection',
      'Implement time-travel state debugging and transaction recording',
      'Release @samrey/testing headless DOM runner for fast unit and integration tests'
    ],
    verificationGate: [
      'DevTools connects with <1% runtime CPU overhead in development mode',
      'Full headless test suite runs in under 3 seconds in CI'
    ],
    deliverablePackages: ['@samrey/devtools', '@samrey/testing']
  },
  {
    phaseNumber: 7,
    name: 'Benchmarks, Security Fuzzing & Public Alpha Release',
    duration: 'M8',
    status: 'Planned',
    objectives: [
      'Submit official implementation to js-framework-benchmark suite',
      'Execute continuous automated security fuzzing against OWASP XSS databases',
      'Release comprehensive documentation, interactive playground, and starter templates'
    ],
    verificationGate: [
      'Top-tier rankings in DOM manipulation speed and memory consumption',
      'Zero high or critical security audit findings from external penetration testing'
    ],
    deliverablePackages: ['All 12 Packages (v0.1.0-alpha)']
  }
];

export const DEFERRED_FEATURES: DeferredFeature[] = [
  {
    feature: 'Custom Bytecode Virtual Machine',
    reason: 'Excessive complexity and memory overhead. Modern JavaScript JIT engines optimize native JS closures and direct DOM mutations significantly better.',
    alternative: 'Native JavaScript closures paired with static <template> cloning.'
  },
  {
    feature: 'Proprietary In-Browser Template Compiler (eval/new Function)',
    reason: 'Violates Core Tenet #1 (Zero-eval Runtime Guarantee) and breaks strict enterprise Content Security Policies (script-src self).',
    alternative: '100% Ahead-of-Time (AOT) compilation via @samrey/compiler.'
  },
  {
    feature: 'Proprietary CSS-in-JS Runtime',
    reason: 'Runtime style injection degrades CSSOM performance, causes style recalculation thrashing, and increases client bundle size.',
    alternative: 'Standard CSS Modules, Tailwind CSS, and compiled native CSS variables.'
  },
  {
    feature: 'Core Micro-Frontend Federation Engine',
    reason: 'Introducing Module Federation abstractions inside the core runtime pollutes dependency trees and complicates reactivity scopes.',
    alternative: 'Standard ECMAScript dynamic imports (import()) and standard Web Components wrapper.'
  },
  {
    feature: 'Proprietary Client-Side Database / ORM',
    reason: 'Bloats client bundle size; the frontend framework should remain strictly database-agnostic.',
    alternative: 'Standard REST / GraphQL / RPC integration via @samrey/http and route loaders.'
  },
  {
    feature: 'Two-Way Bidirectional Magic Binding',
    reason: 'Creates unpredictable state mutations, hidden side effects, and debugging loops in large applications.',
    alternative: 'Unidirectional data flow with explicit event-driven mutations and standard schema form bindings.'
  }
];
