import { CategoryInfo, DimensionItem } from '../types';

export const CATEGORIES: Record<string, CategoryInfo> = {
  A: {
    code: 'A',
    label: 'Actual Security Vulnerability',
    badgeColor: 'bg-red-500/15 text-red-700 border-red-500/30',
    description: 'Exploitable security flaw, unsafe dynamic execution, SSR injection, or default-insecure primitive.'
  },
  B: {
    code: 'B',
    label: 'Architectural Limitation',
    badgeColor: 'bg-amber-500/15 text-amber-700 border-amber-500/30',
    description: 'Structural bottlenecks inherent to the paradigm (e.g. VDOM re-render cascading, full component re-execution).'
  },
  C: {
    code: 'C',
    label: 'Performance Tradeoff',
    badgeColor: 'bg-blue-500/15 text-blue-700 border-blue-500/30',
    description: 'Deliberate engineering compromise (e.g. upfront compilation time vs runtime size, proxy overhead vs raw object speed).'
  },
  D: {
    code: 'D',
    label: 'Ecosystem Problem',
    badgeColor: 'bg-purple-500/15 text-purple-700 border-purple-500/30',
    description: 'Library fragmentation, abandoned router packages, third-party un-typed plugins, or breaking epoch migrations.'
  },
  E: {
    code: 'E',
    label: 'Developer-Experience (DX) Problem',
    badgeColor: 'bg-orange-500/15 text-orange-700 border-orange-500/30',
    description: 'Cognitive overhead, subtle footguns (e.g. stale closures, lost reactivity on destructure, hook rules).'
  },
  F: {
    code: 'F',
    label: 'Intentional Design Decision',
    badgeColor: 'bg-emerald-500/15 text-emerald-700 border-emerald-500/30',
    description: 'Explicit, conscious architectural choice aligned with core framework philosophy.'
  }
};

export const DIMENSIONS: DimensionItem[] = [
  {
    id: 'rendering',
    dimension: 'Rendering Architecture',
    react: {
      summary: 'Virtual DOM diffing (Fiber tree reconciliation)',
      category: 'B',
      details: 'Component functions re-run from top-to-bottom on state changes. Generates full virtual element trees requiring fiber tree diffing before committing updates to the DOM. Causes memory allocation churn and GC pressure.'
    },
    angular: {
      summary: 'Incremental DOM / Ivy bytecode instructions',
      category: 'C',
      details: 'Ivy compiler transforms HTML templates into concise procedural bytecode instructions (elementStart, text, elementEnd). Low memory footprint, but updates step through a VM interpreter loop (LView).'
    },
    vue: {
      summary: 'Hybrid Virtual DOM with Block Trees & Patch Flags',
      category: 'C',
      details: 'Combines dynamic VDOM with compile-time static node hoisting and bitwise patch flags. Skips static subtrees during diffing, but still creates virtual node objects for all dynamic bindings.'
    },
    svelte: {
      summary: 'Compiler-generated direct DOM surgical mutations',
      category: 'F',
      details: 'Compiles templates into imperative DOM manipulation statements (Svelte 5 Runes). Zero Virtual DOM at runtime. Updates target exact DOM text and attribute nodes.'
    },
    solid: {
      summary: 'Static <template> cloning with direct DOM mutations',
      category: 'F',
      details: 'Compiles JSX into native HTML <template> elements and clones them via cloneNode(true). Sibling pointers walk the tree once during initialization. Zero VDOM.'
    },
    aether: {
      summary: 'Static <template> clone hoisting with fine-grained DOM slot bindings',
      architecturalSolution: 'Module-level pre-parsed <template> tags cloned via native browser C++ cloneNode(true). Signal bindings hook directly into text nodes and attributes with zero VDOM.'
    }
  },
  {
    id: 'reactivity',
    dimension: 'Reactivity & State Propagation',
    react: {
      summary: 'Coarse-grained component re-execution triggered by setState',
      category: 'B',
      details: 'State is local to component execution contexts. Changing state triggers a full re-render of the component and all unmemoized children.'
    },
    angular: {
      summary: 'Hybrid: Angular Signals (push-pull) + Zone.js dirty checking',
      category: 'B',
      details: 'Modern Angular uses push-pull Signals with versioning, but legacy applications rely on Zone.js monkey-patching async APIs to trigger top-down dirty checking passes.'
    },
    vue: {
      summary: 'Fine-grained Proxy-based reactive graph (ref, reactive)',
      category: 'E',
      details: 'Deep reactivity achieved via JavaScript Proxy objects. Destructuring reactive objects drops reactivity unless wrapped in toRefs(). Requires .value in script but not in template.'
    },
    svelte: {
      summary: 'Fine-grained Runes ($state, $derived, $effect) via AST transform',
      category: 'F',
      details: 'Svelte 5 uses universal Runes that work across components and .svelte.ts modules. Compiler translates signal access into reactive graph operations.'
    },
    solid: {
      summary: 'Fine-grained Signals (createSignal, createMemo, createEffect)',
      category: 'F',
      details: 'Pure push-pull reactive graph. Components execute once; only subscriber closures execute when signals change. Dynamic values must be wrapped in getters.'
    },
    aether: {
      summary: 'Glitch-free topological push-pull Signals with O(1) clock dirty flagging',
      architecturalSolution: 'Topologically ordered graph with transaction clocks. Guarantees zero redundant evaluations, eliminates the Diamond Dependency problem, and prunes destroyed scopes via Owner disposal trees.'
    }
  },
  {
    id: 'compilation',
    dimension: 'Compilation Strategy',
    react: {
      summary: 'Light JSX transform (jsx-runtime) + React Compiler (AST memoization)',
      category: 'E',
      details: 'Standard compilation emits React.createElement or _jsx calls. The experimental React Compiler uses complex AST analysis to auto-inject useMemo/useCallback memoization blocks.'
    },
    angular: {
      summary: 'Ahead-of-Time (AOT) template compilation to Ivy instructions',
      category: 'C',
      details: 'ngc compiler validates HTML templates against component TypeScript classes and generates type-safe Ivy bytecode instructions.'
    },
    vue: {
      summary: 'SFC compilation (@vue/compiler-sfc) with static node hoisting',
      category: 'F',
      details: 'Compiles Single-File Components (.vue) into render functions, extracting static DOM subtrees into hoisted constants to minimize runtime object creation.'
    },
    svelte: {
      summary: 'Heavy compile-time AST transformation of Runes & templates',
      category: 'C',
      details: 'Compiles custom Svelte syntax into fine-grained reactive setup and DOM mutation code. Bundle size scales with template volume across large codebases.'
    },
    solid: {
      summary: 'JSX-to-DOM compiler (babel-preset-solid) emitting template cloning & effects',
      category: 'F',
      details: 'Transforms JSX markup into native template element string literals and effect bindings with sibling traversal paths.'
    },
    aether: {
      summary: 'Aether Intermediate Representation (AIR) with AOT Security & A11y Verification',
      architecturalSolution: 'Multi-pass compiler generates an intermediate representation (AIR), hoists static templates, classifies security contexts (URI, HTML, CSS), lints accessibility, and emits zero-overhead JS.'
    }
  },
  {
    id: 'runtime-size',
    dimension: 'Runtime Overhead & Bundle Size',
    react: {
      summary: 'Heavy (~45-50 kB min+gzip core runtime + fiber reconciler)',
      category: 'C',
      details: 'Includes Fiber scheduler, synthetic event system, concurrent mode reconciler, and context propagation machinery.'
    },
    angular: {
      summary: 'Heavy (~55-70 kB min+gzip core + platform-browser)',
      category: 'C',
      details: 'Includes DI injection container, Ivy instruction interpreter, metadata reflection tables, and zone/signal change detection runtime.'
    },
    vue: {
      summary: 'Moderate (~28-34 kB min+gzip core + reactivity)',
      category: 'C',
      details: 'Includes Proxy reactivity engine, component instance lifecycles, and block-tree virtual DOM diffing reconciler.'
    },
    svelte: {
      summary: 'Ultra-light (~3-6 kB min+gzip runtime helpers)',
      category: 'F',
      details: 'Minimal runtime; most logic is emitted directly into compiled component files. Tradeoff: larger per-component generated code.'
    },
    solid: {
      summary: 'Minimal (~6-8 kB min+gzip core reactive engine + DOM helpers)',
      category: 'F',
      details: 'Extremely lean runtime consisting of signal propagation primitives and template cloning helpers.'
    },
    aether: {
      summary: 'Minimal (<7 kB min+gzip core runtime, zero VDOM reconciler)',
      architecturalSolution: 'Stripped core containing only the push-pull signal graph, template cloning engine, and event delegator. All higher-level modules (router, forms, http) are tree-shakeable.'
    }
  },
  {
    id: 'xss-security',
    dimension: 'Security Model & XSS Handling',
    react: {
      summary: 'Escapes JSX children; dangerouslySetInnerHTML bypass; URI protocol gaps',
      category: 'A',
      details: 'Escapes text in JSX, but allows dangerouslySetInnerHTML. Historically vulnerable to javascript: href URLs and SSR JSON serialization breakout in RSC payloads.'
    },
    angular: {
      summary: 'Built-in DomSanitizer with SecurityContexts; bypass mechanisms',
      category: 'F',
      details: 'Strict contextual sanitization by default. However, developers frequently bypass it via bypassSecurityTrustHtml/Script when struggling with styling or HTML embedding.'
    },
    vue: {
      summary: 'Default interpolation escaping; v-html bypass; SVG namespace risks',
      category: 'A',
      details: 'Escapes mustache expressions {{ }}, but v-html renders unsanitized raw HTML directly. In-browser runtime compiler allowed template injection XSS if user input was compiled.'
    },
    svelte: {
      summary: 'Default {} escaping; {@html} bypass; historical SSR attribute injection',
      category: 'A',
      details: 'Escapes standard bindings. {@html} bypass provides zero sanitization. CVE-2023-45142 and CVE-2020-28493 involved SSR attribute injection and unescaped HTML content.'
    },
    solid: {
      summary: 'Default JSX escaping; innerHTML property assignments bypass',
      category: 'A',
      details: 'Standard JSX string escaping. Using innerHTML or unescaped SSR string interpolation can lead to injection if not passed through custom sanitizers.'
    },
    aether: {
      summary: 'Context-Aware Auto-Sanitizing Compiler + Trusted Types + Zero-eval Guarantee',
      architecturalSolution: 'Compiler classifies every binding context (URI, Safe Attr, Text, CSS). Blocks javascript: schemes at compile-time. Emits Trusted Types policies. Zero eval() in codebase.'
    }
  },
  {
    id: 'ssr-hydration',
    dimension: 'SSR, Streaming & Hydration',
    react: {
      summary: 'React Server Components (RSC) + HTML Suspense streaming + Full VDOM Hydration',
      category: 'B',
      details: 'Streams HTML with Suspense. However, client hydration re-executes all client components to rebuild the Fiber tree before attaching interactive event listeners.'
    },
    angular: {
      summary: 'Angular SSR with TransferState and progressive hydration (Blocks)',
      category: 'F',
      details: 'Supports event replay and progressive block-level hydration with state transfer serialization.'
    },
    vue: {
      summary: '@vue/server-renderer with async SSR context and VDOM hydration',
      category: 'B',
      details: 'Server renders HTML strings; client walks real DOM and verifies/attaches to matching Virtual DOM tree.'
    },
    svelte: {
      summary: 'SvelteKit server load streaming with deferred promises & DOM hydration',
      category: 'F',
      details: 'Fast SSR string generation; client traverses DOM nodes using claim_element/claim_text to attach event listeners without rebuilding markup.'
    },
    solid: {
      summary: 'SolidStart async/stream SSR with fine-grained Suspense & serialized events',
      category: 'F',
      details: 'Streams HTML chunks; embeds serialized event delegation script to record user clicks before client bundle finishes downloading.'
    },
    aether: {
      summary: 'Universal Async Out-of-Order Streaming SSR with Resumable Micro-Hydration',
      architecturalSolution: 'Streams HTML with hidden <template> chunk swapping. Root event listener (200 bytes) buffers early user clicks. Client resumes reactive graph from escaped Unicode JSON without re-running component initialization.'
    }
  },
  {
    id: 'forms',
    dimension: 'Form Management & Validation',
    react: {
      summary: 'Uncontrolled/controlled manual state or heavy external libraries',
      category: 'D',
      details: 'No built-in form validation. Ecosystem relies on React Hook Form, Formik, or TanStack Form, requiring manual glue code for validation schemas and ARIA attributes.'
    },
    angular: {
      summary: 'Built-in Reactive Forms & Template-driven forms with async validators',
      category: 'F',
      details: 'Comprehensive built-in FormBuilder, FormGroup, and FormControl classes with synchronous and asynchronous validation pipelines.'
    },
    vue: {
      summary: 'Manual two-way v-model or community libraries (VeeValidate, FormKit)',
      category: 'D',
      details: 'Provides convenient v-model two-way binding, but schema validation requires external libraries like VeeValidate.'
    },
    svelte: {
      summary: 'Manual binding bind:value or community packages (Superforms)',
      category: 'D',
      details: 'bind:value simplifies form state binding, but server actions and schema validation require community libraries like SvelteKit Superforms.'
    },
    solid: {
      summary: 'Community libraries (Modular Forms, Felte) or signal bindings',
      category: 'D',
      details: 'No standard built-in form engine; developers rely on community packages or build custom signal wrappers.'
    },
    aether: {
      summary: 'Built-in Standard Schema Forms (Zod/Valibot/ArkType) + Auto-ARIA Wiring',
      architecturalSolution: 'First-class @aether/forms natively validates schemas conforming to the Standard Schema spec. Automatically computes aria-invalid, aria-describedby, and supports progressive enhancement POST actions.'
    }
  },
  {
    id: 'routing',
    dimension: 'Routing & Navigation',
    react: {
      summary: 'Ecosystem-dependent (React Router, TanStack Router, Next.js App Router)',
      category: 'D',
      details: 'No standard built-in router. Fragmented between Next.js RSC router, React Router v6/v7, and TanStack Router, each with different data loading paradigms.'
    },
    angular: {
      summary: 'Built-in @angular/router with guards, resolvers, and lazy loading',
      category: 'F',
      details: 'Mature, enterprise-grade router integrated into Angular CLI with hierarchical route matching, guards (CanActivate), and resolvers.'
    },
    vue: {
      summary: 'Official vue-router with navigation guards & scroll behavior',
      category: 'F',
      details: 'Official router maintained by the core team with smooth transitions and route guards.'
    },
    svelte: {
      summary: 'Built-in SvelteKit file-based router with load functions',
      category: 'F',
      details: 'SvelteKit provides directory-based routing (+page.svelte, +layout.svelte) with universal load functions.'
    },
    solid: {
      summary: 'Solid Router / SolidStart with nested routes & data loaders',
      category: 'F',
      details: 'Declarative JSX or file-based routing with route-level data loaders and transition integration.'
    },
    aether: {
      summary: 'Type-Safe Dual Router (File-Based & Code-Based) with Streaming Loaders',
      architecturalSolution: 'Built-in @aether/router supporting both filesystem route discovery and type-safe JSX routes. Features automatic prefetching on link hover/viewport, nested layouts, and View Transitions API.'
    }
  }
];
