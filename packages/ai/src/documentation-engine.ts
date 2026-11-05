/**
 * @license Apache-2.0
 * @samrey/ai - Framework Knowledge & Documentation Engine
 */

export interface DocSection {
  id: string;
  title: string;
  category:
    | 'overview'
    | 'reactivity'
    | 'runtime'
    | 'compiler'
    | 'security'
    | 'router'
    | 'forms'
    | 'http'
    | 'ssr'
    | 'testing'
    | 'devtools'
    | 'cli'
    | 'error-codes'
    | 'best-practices';
  summary: string;
  content: string;
  keywords: string[];
  minVersion?: string;
  package?: string;
}

export interface ApiReference {
  name: string;
  package: string;
  category: string;
  signature: string;
  description: string;
  parameters: Array<{ name: string; type: string; description: string; optional?: boolean }>;
  returns: { type: string; description: string };
  example: string;
  notes?: string[];
}

export interface SearchResult {
  sectionId: string;
  title: string;
  category: string;
  package?: string;
  snippet: string;
  relevanceScore: number;
  matchedKeywords: string[];
}

export const SAMREY_DOC_SECTIONS: DocSection[] = [
  {
    id: 'overview-philosophy',
    title: 'Samrey Core Architectural Philosophy',
    category: 'overview',
    summary: 'Pure TypeScript, fine-grained reactivity, zero VDOM, compile-time static template hoisting.',
    keywords: ['philosophy', 'architecture', 'vdom', 'zero-vdom', 'fine-grained', 'performance', 'solid', 'react'],
    content: `# Samrey Core Architectural Philosophy

Samrey is an independent, high-performance TypeScript frontend framework engineered around three core invariants:

1. **Zero Virtual DOM (VDOM)**: Unlike React or Vue which re-render entire component subtrees creating virtual node trees and diffing them, Samrey executes components **exactly once** during initial creation.
2. **Compile-Time Static Template Hoisting**: The Samrey compiler parses templates, extracts static HTML subtrees into hoisted browser \`<template>\` elements (\`_tmpl$1 = template("<div>...</div>")\`), and generates native \`cloneNode(true)\` operations.
3. **Surgical Fine-Grained Bindings**: Dynamic values (text interpolations, attributes, event handlers, and control flow) are bound directly to real DOM nodes using microscopic runtime helpers (\`bindText\`, \`bindAttr\`, \`on\`). When a signal changes, ONLY the exact DOM text node or attribute updates—no component function re-runs.`
  },
  {
    id: 'reactivity-signals',
    title: 'Signals & Reactive Primitives (@samrey/reactivity)',
    category: 'reactivity',
    package: '@samrey/reactivity',
    summary: 'Fine-grained reactive signals: read via .value, write via .value = or .set() / .update().',
    keywords: ['signal', 'computed', 'effect', 'reactivity', 'state', 'batch', 'untrack', 'store'],
    content: `# Signals & Reactive Primitives (@samrey/reactivity)

Reactivity in Samrey is driven by pure signals and transparent dependency tracking.

## Core Primitives

### 1. \`signal<T>(initialValue: T)\`
Creates a reactive state holder.
- **Reading**: \`count.value\` (automatically tracks the current active effect/computation).
- **Writing**: \`count.value = 5\` or \`count.set(5)\` or \`count.update(n => n + 1)\`.
- **Invariants**: Reading outside an effect or computation returns the raw value without tracking.

\`\`\`ts
import { signal } from '@samrey/reactivity';

const count = signal(0);
console.log(count.value); // 0
count.value++; // triggers subscribers
count.set(10);
count.update(n => n * 2);
\`\`\`

### 2. \`computed<T>(fn: () => T)\`
Creates a lazily evaluated, memoized derived signal.
- Re-evaluates only when tracked dependencies change and the computation is read.

\`\`\`ts
import { signal, computed } from '@samrey/reactivity';

const price = signal(100);
const taxRate = signal(0.15);
const total = computed(() => price.value * (1 + taxRate.value));
\`\`\`

### 3. \`effect(fn: () => void)\`
Registers a side-effect that automatically re-executes whenever its accessed signals mutate.

\`\`\`ts
import { signal, effect } from '@samrey/reactivity';

const name = signal('World');
effect(() => {
  console.log(\`Hello, \${name.value}!\`);
});
\`\`\`

### 4. \`batch<T>(fn: () => T)\`
Batches multiple signal mutations into a single subscriber notification cycle, avoiding intermediate recalculations.

\`\`\`ts
import { signal, batch } from '@samrey/reactivity';

const first = signal('John');
const last = signal('Doe');

batch(() => {
  first.value = 'Jane';
  last.value = 'Smith';
}); // Subscribers notified once
\`\`\`

### 5. \`untrack<T>(fn: () => T)\`
Executes a function without tracking any signals read inside it.`
  },
  {
    id: 'runtime-components-and-dom',
    title: 'Runtime DOM & Components (@samrey/runtime)',
    category: 'runtime',
    package: '@samrey/runtime',
    summary: 'Component creation, static template cloning, surgical bindings, and control flow.',
    keywords: ['runtime', 'component', 'dom', 'template', 'bindText', 'bindAttr', 'Show', 'For', 'Switch', 'Match'],
    content: `# Runtime DOM & Components (@samrey/runtime)

Samrey components are pure JavaScript functions that execute once and return native DOM nodes.

## Component Structure

\`\`\`ts
import { signal } from '@samrey/reactivity';
import { on, bindText, template } from '@samrey/runtime';

const _tmpl = template('<button class="btn">Count: </button>');

export function Counter(props: { initial?: number }) {
  const count = signal(props.initial ?? 0);
  const root = _tmpl();
  
  // Surgical text binding attached to child text node
  bindText(root.firstChild as Text, () => \`Count: \${count.value}\`);
  
  // Event listener
  on(root, 'click', () => count.update(n => n + 1));
  
  return root;
}
\`\`\`

## Control Flow Primitives

### 1. \`Show({ when, children, fallback })\`
Conditional rendering primitive. Replaces DOM elements smoothly when condition changes without re-mounting the container.

\`\`\`ts
import { Show } from '@samrey/runtime';

Show({
  when: () => user.value !== null,
  children: () => ProfileView({ user: user.value! }),
  fallback: () => LoginPrompt()
})
\`\`\`

### 2. \`For({ each, key, children })\`
Keyed list reconciliation engine with 90%+ node reuse.

\`\`\`ts
import { For } from '@samrey/runtime';

For({
  each: () => todos.value,
  key: (item) => item.id,
  children: (item, index) => TodoItem({ todo: item })
})
\`\`\``
  },
  {
    id: 'compiler-overview',
    title: 'Samrey Compiler & AOT Pipeline (@samrey/compiler)',
    category: 'compiler',
    package: '@samrey/compiler',
    summary: 'Ahead-Of-Time compilation, Abstract Intermediate Representation (AIR), template hoisting, a11y & security linting.',
    keywords: ['compiler', 'aot', 'air', 'template', 'hoisting', 'vite-plugin', 'ast', 'errors'],
    content: `# Samrey Compiler & AOT Pipeline (@samrey/compiler)

The Samrey compiler converts JSX / HTML templates into fine-grained reactive runtime instructions.

## Pipeline Architecture
1. **Parser**: Produces Abstract Intermediate Representation (AIR).
2. **Static Subtree Analyzer**: Hoists completely invariant markup into \`template("...")\`.
3. **Security Classifier**: Analyzes attribute contexts (URL, HTML, Style) and injects automatic sanitization.
4. **Accessibility Linter**: Flags missing \`alt\` tags, missing form labels, and invalid ARIA attributes during compilation.
5. **Codegen**: Outputs tree-shakable ES modules using \`template()\`, \`bindText()\`, \`bindAttr()\`, and \`on()\`.`
  },
  {
    id: 'router-navigation',
    title: 'Client-Side Routing (@samrey/router)',
    category: 'router',
    package: '@samrey/router',
    summary: 'Type-safe reactive client router with RouterOutlet, Link, params, and history mode.',
    keywords: ['router', 'routing', 'RouterOutlet', 'Link', 'useParams', 'useLocation', 'useNavigate', 'navigation'],
    content: `# Client-Side Routing (@samrey/router)

Samrey provides a reactive client router that synchronizes URL changes with fine-grained DOM view swaps.

\`\`\`ts
import { createRouter, RouterOutlet, Link, useParams } from '@samrey/router';
import { HomeView } from './views/Home.js';
import { UserView } from './views/User.js';

export const router = createRouter([
  { path: '/', component: HomeView },
  { path: '/users/:id', component: UserView }
]);

export function App() {
  const params = useParams();
  // params is a reactive signal containing dynamic route parameters
  return RouterOutlet();
}
\`\`\``
  },
  {
    id: 'forms-validation',
    title: 'Forms & Standard Schema Validation (@samrey/forms)',
    category: 'forms',
    package: '@samrey/forms',
    summary: 'Reactive form state management with Standard Schema (Zod/Valibot) validation and ARIA attributes.',
    keywords: ['forms', 'form', 'field', 'validation', 'zod', 'schema', 'standard-schema', 'useField'],
    content: `# Forms & Standard Schema Validation (@samrey/forms)

\`@samrey/forms\` manages input state, touched/dirty tracking, field validation, and accessible error association.

\`\`\`ts
import { createForm } from '@samrey/forms';

const form = createForm({
  initialValues: { email: '', password: '' },
  onSubmit: async (values) => {
    await loginUser(values);
  }
});
\`\`\``
  },
  {
    id: 'http-and-resources',
    title: 'HTTP Client & Async Resources (@samrey/http)',
    category: 'http',
    package: '@samrey/http',
    summary: 'createResource async state primitive and secure HTTP client with CSRF token management.',
    keywords: ['http', 'fetch', 'resource', 'createResource', 'createHttpClient', 'csrf', 'async'],
    content: `# HTTP Client & Async Resources (@samrey/http)

\`createResource\` wraps asynchronous operations in a reactive state container with automatic loading and error tracking.

\`\`\`ts
import { createResource } from '@samrey/http';

const [users, { refetch }] = createResource(async () => {
  const res = await fetch('/api/users');
  return res.json();
});

// users.loading is a signal
// users.data is a signal
// users.error is a signal
\`\`\``
  },
  {
    id: 'ssr-and-hydration',
    title: 'Server-Side Rendering & Hydration (@samrey/ssr)',
    category: 'ssr',
    package: '@samrey/ssr',
    summary: 'renderToString, renderToStream with progressive chunk streaming, client hydration, and secret scrubbing.',
    keywords: ['ssr', 'hydration', 'renderToString', 'renderToStream', 'hydrate', 'ssg', 'streaming'],
    content: `# Server-Side Rendering & Hydration (@samrey/ssr)

Samrey supports high-speed SSR without spinning up a headless browser.

## Synchronous / Async SSR
\`\`\`ts
import { renderToString } from '@samrey/ssr';
import { App } from './src/App.js';

const html = await renderToString(() => App());
\`\`\`

## Streaming SSR
\`renderToStream\` pipes HTML chunks directly into Node.js HTTP response streams for sub-millisecond Time-To-First-Byte (TTFB).`
  },
  {
    id: 'testing-harness',
    title: 'Component & Integration Testing (@samrey/testing)',
    category: 'testing',
    package: '@samrey/testing',
    summary: 'DOM-based component mounting, fireEvent, flushReactivity, and clean test isolation.',
    keywords: ['testing', 'test', 'renderTest', 'fireEvent', 'flushReactivity', 'assert', 'harness'],
    content: `# Component & Integration Testing (@samrey/testing)

Test Samrey components in Node.js with built-in DOM mock or JSDOM/HappyDOM.

\`\`\`ts
import { renderTest, fireEvent, flushReactivity } from '@samrey/testing';
import assert from 'node:assert/strict';
import { Counter } from './Counter.js';

const { container } = renderTest(() => Counter({ initial: 5 }));
const btn = container.querySelector('button')!;

fireEvent(btn, 'click');
await flushReactivity();
assert.ok(container.textContent?.includes('Count: 6'));
\`\`\``
  },
  {
    id: 'security-context',
    title: 'Security Contexts & Sanitization (@samrey/security)',
    category: 'security',
    package: '@samrey/security',
    summary: 'Zero-eval, Trusted Types, URL/HTML sanitization, and strict attribute defense.',
    keywords: ['security', 'xss', 'sanitize', 'trusted-types', 'eval', 'csrf', 'injection'],
    content: `# Security Contexts & Sanitization (@samrey/security)

Samrey enforces zero-eval and strict context-aware sanitization by default:
- \`sanitizeUrl(url)\`: Blocks \`javascript:\`, \`vbscript:\`, and unsafe \`data:\` schemes.
- \`sanitizeHtml(html)\`: Cleans untrusted rich text markup.
- \`verifyTrustedHtml(html)\`: Validates against Trusted Types policies.`
  },
  {
    id: 'cli-tooling',
    title: 'Samrey CLI Commands & Tooling (@samrey/cli)',
    category: 'cli',
    package: '@samrey/cli',
    summary: 'Developer CLI: create, dev, build, preview, test, audit, analyze, generate, and ai.',
    keywords: ['cli', 'samrey', 'create', 'dev', 'build', 'audit', 'generate', 'ai'],
    content: `# Samrey CLI Commands (@samrey/cli)

- \`samrey create <name> [--template ssr|spa|minimal]\`: Scaffolds a new production application.
- \`samrey dev [--port <port>]\`: Starts Vite dev server.
- \`samrey build [--report]\`: Compiles and bundles for production.
- \`samrey test\`: Runs project test runner.
- \`samrey audit\`: Runs static security and accessibility checks.
- \`samrey analyze\`: Inspects bundle file sizes and gzip footprints.
- \`samrey generate <type> <name>\`: Scaffolds components, routes, stores, or resources.
- \`samrey ai <init|doctor|docs|validate|mcp|skills>\`: AI tooling & integration.`
  },
  {
    id: 'error-codes-reference',
    title: 'Compiler Diagnostic Error Codes Reference',
    category: 'error-codes',
    package: '@samrey/compiler',
    summary: 'SAMREY-101 through SAMREY-108 structured error codes and solutions.',
    keywords: ['errors', 'diagnostic', 'SAMREY-101', 'SAMREY-102', 'SAMREY-108', 'compiler-error'],
    content: `# Compiler Diagnostic Error Codes Reference

- **SAMREY-101**: Unclosed HTML/JSX tag in template. Close the tag with \`</tag>\` or self-close \`<tag />\`.
- **SAMREY-102**: Unterminated interpolation expression \`{...\`. Ensure matching closing brace \`}\`.
- **SAMREY-104**: Mismatched or unexpected closing tag.
- **SAMREY-105**: Unterminated attribute literal string.
- **SAMREY-108**: Custom control flow tag (\`<Show>\` or \`<For>\`) used as HTML markup. In Samrey, \`Show\` and \`For\` are component functions, called via \`Show({ when, children })\` or runtime expressions, not template elements.`
  },
  {
    id: 'best-practices-guide',
    title: 'Samrey Development Best Practices & Anti-Patterns',
    category: 'best-practices',
    summary: 'Essential do\'s and don\'ts: signals vs hooks, one-time execution, keyed lists.',
    keywords: ['best-practices', 'anti-patterns', 'hooks', 'react', 'useState', 'pitfalls'],
    content: `# Samrey Development Best Practices & Anti-Patterns

### ✅ DO:
1. Access signals using \`.value\` inside effects, computations, and template functions to ensure reactive subscriptions.
2. Call components once to produce DOM nodes: components do NOT re-run on state changes.
3. Use \`batch()\` when updating multiple related signals simultaneously.
4. Provide unique identifier functions for \`key\` in \`For({ each, key, children })\`.
5. Clean up external timers and subscriptions with \`onCleanup()\`.

### ❌ DO NOT:
1. **NEVER use React hooks** (\`useState\`, \`useEffect\`, \`useCallback\`, \`useMemo\`). Samrey is NOT React!
2. **NEVER mutate signal values in-place** (e.g. \`todos.value.push(item)\`). Instead, create a new array reference: \`todos.value = [...todos.value, item]\` or use \`todos.update()\`.
3. **NEVER declare \`<Show>\` or \`<For>\` as raw HTML tags** in templates.
4. **NEVER use Virtual DOM libraries** or attempt to diff DOM trees manually.`
  }
];

export const SAMREY_API_REGISTRY: ApiReference[] = [
  {
    name: 'signal',
    package: '@samrey/reactivity',
    category: 'reactivity',
    signature: 'function signal<T>(initialValue: T): Signal<T>',
    description: 'Creates a fine-grained reactive state container with value getter, setter, update, and subscription tracking.',
    parameters: [{ name: 'initialValue', type: 'T', description: 'The starting value of the signal.' }],
    returns: { type: 'Signal<T>', description: 'Reactive signal object with .value property, .set(), and .update() methods.' },
    example: `const count = signal(0);\ncount.value++; // or count.set(1);`
  },
  {
    name: 'computed',
    package: '@samrey/reactivity',
    category: 'reactivity',
    signature: 'function computed<T>(fn: () => T): ReadonlySignal<T>',
    description: 'Creates a memoized derived signal that lazily recomputes only when dependencies change.',
    parameters: [{ name: 'fn', type: '() => T', description: 'Pure derivation function.' }],
    returns: { type: 'ReadonlySignal<T>', description: 'Readonly derived signal.' },
    example: `const double = computed(() => count.value * 2);`
  },
  {
    name: 'effect',
    package: '@samrey/reactivity',
    category: 'reactivity',
    signature: 'function effect(fn: () => void): () => void',
    description: 'Runs a side-effect immediately and re-runs it whenever any signals read inside fn change.',
    parameters: [{ name: 'fn', type: '() => void', description: 'Effect execution block.' }],
    returns: { type: '() => void', description: 'Disposal function to stop the effect.' },
    example: `const dispose = effect(() => console.log('Count is', count.value));`
  },
  {
    name: 'batch',
    package: '@samrey/reactivity',
    category: 'reactivity',
    signature: 'function batch<T>(fn: () => T): T',
    description: 'Batches multiple signal mutations into a single subscriber notification cycle.',
    parameters: [{ name: 'fn', type: '() => T', description: 'Synchronous mutation block.' }],
    returns: { type: 'T', description: 'The return value of fn.' },
    example: `batch(() => { a.value = 1; b.value = 2; });`
  },
  {
    name: 'template',
    package: '@samrey/runtime',
    category: 'runtime',
    signature: 'function template(html: string): () => Node',
    description: 'Creates an optimized template cloner function that executes native browser cloneNode(true).',
    parameters: [{ name: 'html', type: 'string', description: 'Static HTML string.' }],
    returns: { type: '() => Node', description: 'Cloner function returning fresh DOM node.' },
    example: `const _tmpl$1 = template('<div class="box"><span>Hello</span></div>');\nconst node = _tmpl$1();`
  },
  {
    name: 'Show',
    package: '@samrey/runtime',
    category: 'runtime',
    signature: 'function Show(props: { when: () => boolean; children: () => Node; fallback?: () => Node }): Node',
    description: 'Conditional rendering control flow helper.',
    parameters: [
      { name: 'props.when', type: '() => boolean', description: 'Reactive condition accessor.' },
      { name: 'props.children', type: '() => Node', description: 'Render function when condition is true.' },
      { name: 'props.fallback', type: '() => Node', description: 'Optional render function when condition is false.', optional: true }
    ],
    returns: { type: 'Node', description: 'Reactive DOM comment anchor / mounted content.' },
    example: `Show({ when: () => isLogged.value, children: () => UserDashboard(), fallback: () => LoginView() });`
  },
  {
    name: 'For',
    package: '@samrey/runtime',
    category: 'runtime',
    signature: 'function For<T>(props: { each: () => T[]; key: (item: T, index: number) => any; children: (item: T, index: () => number) => Node }): Node',
    description: 'Keyed list rendering primitive with high-performance DOM node reuse.',
    parameters: [
      { name: 'props.each', type: '() => T[]', description: 'Reactive array accessor.' },
      { name: 'props.key', type: '(item: T, index: number) => any', description: 'Unique identity extractor.' },
      { name: 'props.children', type: '(item: T, index: () => number) => Node', description: 'Item renderer.' }
    ],
    returns: { type: 'Node', description: 'DOM fragment / anchor containing keyed list.' },
    example: `For({ each: () => items.value, key: (i) => i.id, children: (item) => ListItem({ item }) });`
  },
  {
    name: 'createRouter',
    package: '@samrey/router',
    category: 'router',
    signature: 'function createRouter(options: { routes: RouteConfig[]; mode?: "history" | "hash" }): SamreyRouter',
    description: 'Instantiates client-side router.',
    parameters: [{ name: 'options', type: 'RouterOptions', description: 'Route configuration array and routing mode.' }],
    returns: { type: 'SamreyRouter', description: 'Active router instance.' },
    example: `const router = createRouter({ routes: [{ path: '/', component: Home }] });`
  },
  {
    name: 'createForm',
    package: '@samrey/forms',
    category: 'forms',
    signature: 'function createForm<T>(config: FormConfig<T>): FormInstance<T>',
    description: 'Creates a reactive form instance with validation, dirty/touched tracking, and submission handler.',
    parameters: [{ name: 'config', type: 'FormConfig<T>', description: 'Initial values, schema, and submit callback.' }],
    returns: { type: 'FormInstance<T>', description: 'Reactive form controller.' },
    example: `const form = createForm({ initialValues: { email: '' }, onSubmit: async (vals) => {} });`
  },
  {
    name: 'createResource',
    package: '@samrey/http',
    category: 'http',
    signature: 'function createResource<T>(fetcher: () => Promise<T>): [ResourceState<T>, ResourceActions<T>]',
    description: 'Creates a reactive asynchronous data container tracking data, loading, and error states.',
    parameters: [{ name: 'fetcher', type: '() => Promise<T>', description: 'Async function returning data.' }],
    returns: { type: '[ResourceState<T>, ResourceActions<T>]', description: 'Tuple of reactive state signals and refetch actions.' },
    example: `const [users, { refetch }] = createResource(async () => (await fetch('/api/users')).json());`
  },
  {
    name: 'renderToString',
    package: '@samrey/ssr',
    category: 'ssr',
    signature: 'function renderToString(componentFn: () => Node | Promise<Node>): Promise<string>',
    description: 'Renders a Samrey component tree to static HTML string for SSR.',
    parameters: [{ name: 'componentFn', type: '() => Node | Promise<Node>', description: 'Root component factory.' }],
    returns: { type: 'Promise<string>', description: 'Rendered HTML markup.' },
    example: `const html = await renderToString(() => App());`
  },
  {
    name: 'render',
    package: '@samrey/testing',
    category: 'testing',
    signature: 'function render(componentFn: Function, props?: any): RenderResult',
    description: 'Mounts a component in test DOM environment and provides querying helpers.',
    parameters: [
      { name: 'componentFn', type: 'Function', description: 'Component function.' },
      { name: 'props', type: 'any', description: 'Component props.', optional: true }
    ],
    returns: { type: 'RenderResult', description: 'Container, query utilities, unmount function.' },
    example: `const { container, findByText } = render(Counter, { initial: 1 });`
  }
];

export function searchDocs(query: string, options: { category?: string; limit?: number } = {}): SearchResult[] {
  const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (terms.length === 0) return [];

  const results: SearchResult[] = [];
  const limit = options.limit || 5;

  for (const doc of SAMREY_DOC_SECTIONS) {
    if (options.category && doc.category !== options.category) continue;

    let score = 0;
    const matchedKeywords: string[] = [];
    const lowerTitle = doc.title.toLowerCase();
    const lowerSummary = doc.summary.toLowerCase();
    const lowerContent = doc.content.toLowerCase();

    for (const term of terms) {
      if (lowerTitle.includes(term)) {
        score += 15;
        matchedKeywords.push(term);
      }
      if (lowerSummary.includes(term)) {
        score += 8;
        matchedKeywords.push(term);
      }
      if (doc.keywords.some((k) => k.toLowerCase().includes(term))) {
        score += 10;
        matchedKeywords.push(term);
      }
      if (lowerContent.includes(term)) {
        score += 3;
      }
    }

    if (score > 0) {
      // Extract snippet around first match
      let snippet = doc.summary;
      const firstIndex = lowerContent.indexOf(terms[0]);
      if (firstIndex !== -1) {
        const start = Math.max(0, firstIndex - 60);
        const end = Math.min(lowerContent.length, firstIndex + 140);
        snippet = (start > 0 ? '...' : '') + doc.content.slice(start, end).replace(/\n/g, ' ') + (end < doc.content.length ? '...' : '');
      }

      results.push({
        sectionId: doc.id,
        title: doc.title,
        category: doc.category,
        package: doc.package,
        snippet,
        relevanceScore: score,
        matchedKeywords: Array.from(new Set(matchedKeywords))
      });
    }
  }

  return results.sort((a, b) => b.relevanceScore - a.relevanceScore).slice(0, limit);
}

export function getDocumentation(topicOrSectionId: string): DocSection | undefined {
  const normalized = topicOrSectionId.toLowerCase().trim();
  return SAMREY_DOC_SECTIONS.find(
    (s) =>
      s.id.toLowerCase() === normalized ||
      s.title.toLowerCase().includes(normalized) ||
      s.category.toLowerCase() === normalized
  );
}

export function getApiReference(apiName: string): ApiReference | undefined {
  const normalized = apiName.toLowerCase().trim();
  return SAMREY_API_REGISTRY.find(
    (a) => a.name.toLowerCase() === normalized || a.name.toLowerCase().includes(normalized)
  );
}

export function getBestPractices(): DocSection | undefined {
  return SAMREY_DOC_SECTIONS.find((s) => s.category === 'best-practices');
}

