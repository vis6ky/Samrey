/**
 * @license Apache-2.0
 * @samrey/ai - Portable Agent Skills Generator & Installer
 */

import * as fs from 'node:fs';
import * as path from 'node:path';

export interface AgentSkillDefinition {
  id: string;
  name: string;
  description: string;
  content: string;
}

export const SAMREY_SKILLS: AgentSkillDefinition[] = [
  // 1. samrey-overview
  {
    id: 'samrey-overview',
    name: 'samrey-overview',
    description: 'Understand the core architecture, zero-VDOM compile-time model, and execution invariants of the Samrey framework.',
    content: `---
name: samrey-overview
description: Understand the core architecture, zero-VDOM compile-time model, and execution invariants of the Samrey framework.
---

# Samrey Framework Architecture & Overview

## Purpose
Use this skill when understanding the conceptual foundation of Samrey, answering architectural questions, or designing high-performance web applications without a Virtual DOM.

## When to Use
- When onboarding an AI agent to the Samrey codebase.
- When planning application architecture and module boundaries.
- When explaining why React or Vue idioms cannot be directly used in Samrey.

## Core Architectural Invariants
1. **Zero Virtual DOM**: Component functions execute **EXACTLY ONCE** on mount. They do NOT re-run on signal updates.
2. **Compile-Time Static Hoisting**: The compiler extracts HTML skeletons into hoisted browser \`<template>\` elements (\`_tmpl$1 = template("...")\`).
3. **Fine-Grained Surgical DOM Updates**: Signals trigger micro-updates targeting specific text nodes or attributes via \`bindText\` and \`bindAttr\`.
4. **Pure Signals**: Reactive state is driven by \`signal()\`, \`computed()\`, \`effect()\`, and \`createStore()\` from \`@samrey/reactivity\`.

## Common Mistakes
- **Mistake**: Expecting the component function to re-execute like a React function component when state changes.
  - **Correction**: Place reactive signal reads inside callbacks passed to \`bindText(() => count.value)\` or \`Show({ when: () => condition.value })\`.
- **Mistake**: Using React hooks (\`useState\`, \`useEffect\`).
  - **Correction**: Use \`signal()\` and \`effect()\` from \`@samrey/reactivity\`.

## Validation Instructions
Verify that components execute only once and all reactive updates are localized to dynamic DOM bindings.
`
  },

  // 2. samrey-project-creation
  {
    id: 'samrey-project-creation',
    name: 'samrey-project-creation',
    description: 'Scaffold, configure, and initialize production Samrey applications using the CLI and starter templates.',
    content: `---
name: samrey-project-creation
description: Scaffold, configure, and initialize production Samrey applications using the CLI and starter templates.
---

# Samrey Project Creation & Scaffolding

## Purpose
Guides the creation of new Samrey web projects with correct dependency graphs, Vite plugins, and production starter templates.

## When to Use
- Initializing a new greenfield Samrey project.
- Setting up build tools (Vite, TypeScript, Tailwind CSS).
- Choosing the right starter template (\`ssr\`, \`spa\`, \`minimal\`, \`ssg\`).

## Relevant CLI Commands
\`\`\`bash
# Create an SSR application (recommended for full-stack apps)
npx @samrey/cli create my-app --template ssr

# Create a Single-Page Application (SPA)
npx @samrey/cli create my-spa --template spa

# Initialize AI developer instructions and MCP configs
cd my-app
npx @samrey/cli ai init
\`\`\`

## Project File Layout
\`\`\`
my-app/
├── src/
│   ├── components/      # Reusable UI components
│   ├── routes/          # Application views & router config
│   ├── stores/          # Reactive domain stores
│   ├── App.ts           # Root application shell
│   └── main.ts          # Client entrypoint
├── server.ts            # Node.js SSR server (for ssr template)
├── vite.config.ts       # Vite build config with Samrey compiler plugin
├── package.json
└── tsconfig.json
\`\`\`

## Validation Instructions
Run \`npm run build\` and \`npm test\` inside the project directory to confirm zero build errors.
`
  },

  // 3. samrey-components
  {
    id: 'samrey-components',
    name: 'samrey-components',
    description: 'Create idiomatic Samrey components using static template cloning, surgical bindings, and props.',
    content: `---
name: samrey-components
description: Create idiomatic Samrey components using static template cloning, surgical bindings, and props.
---

# Samrey Components & DOM Bindings

## Purpose
Instructs how to author native Samrey component functions that return DOM nodes with surgical reactive bindings.

## When to Use
- Writing UI elements, buttons, cards, modals, or layout wrappers.
- Attaching dynamic text or attribute bindings.
- Registering event listeners on real DOM nodes.

## Relevant APIs
- \`template(html: string): () => Node\` from \`@samrey/runtime\`
- \`bindText(node: Text, getter: () => string): void\` from \`@samrey/runtime\`
- \`bindAttr(el: Element, name: string, getter: () => any): void\` from \`@samrey/runtime\`
- \`on(el: Element, event: string, handler: Function): void\` from \`@samrey/runtime\`
- \`createComponent(fn: Function, props: object): Node\` from \`@samrey/runtime\`

## Verified Code Example
\`\`\`ts
import { signal } from '@samrey/reactivity';
import { template, on, bindText, bindAttr } from '@samrey/runtime';

const _tmpl = template(\`
<div class="user-card p-4 border rounded">
  <h3 class="name font-bold"></h3>
  <span class="badge text-xs px-2 py-1">Active</span>
  <button class="toggle-btn mt-2 px-3 py-1 bg-blue-500 text-white rounded">Toggle Status</button>
</div>\`);

export function UserCard(props: { username: string }) {
  const isActive = signal(true);
  const root = _tmpl() as HTMLElement;

  bindText(root.querySelector('.name')!, () => props.username);
  bindAttr(root.querySelector('.badge')!, 'class', () =>
    isActive.value ? 'badge bg-green-100 text-green-800' : 'badge bg-gray-100 text-gray-800'
  );

  on(root.querySelector('.toggle-btn')!, 'click', () => {
    isActive.update(v => !v);
  });

  return root;
}
\`\`\`

## Common Mistakes
- **Mistake**: Returning a JSX string instead of DOM elements.
- **Mistake**: Writing \`onClick={...}\` inside \`template('<button onClick="...">')\`. Handlers must be attached via \`on(el, 'click', handler)\`.

## Validation Instructions
Validate component code using \`npx @samrey/cli ai validate <file.ts>\`.
`
  },

  // 4. samrey-reactivity
  {
    id: 'samrey-reactivity',
    name: 'samrey-reactivity',
    description: 'Master fine-grained reactive state, computed values, side effects, batching, and stores in Samrey.',
    content: `---
name: samrey-reactivity
description: Master fine-grained reactive state, computed values, side effects, batching, and stores in Samrey.
---

# Samrey Reactivity System (@samrey/reactivity)

## Purpose
Teaches how to model reactive data flow using signals, derivations, effects, and deep proxies.

## Core Rules
1. **Read with \`.value\`**: To subscribe to a signal in an effect or computation, read \`mySignal.value\`.
2. **Write with \`.value =\` or \`.set()\`**: Trigger subscriber notifications by assigning a new value.
3. **Use \`.update(fn)\` for state transitions**: \`count.update(n => n + 1)\`.
4. **Immutable Collections**: Always assign a new array or object reference when updating signal state: \`items.value = [...items.value, newItem]\`.
5. **Batch Related Writes**: Wrap multiple signal mutations in \`batch(() => { ... })\`.

## Verified Code Example
\`\`\`ts
import { signal, computed, effect, batch, createStore } from '@samrey/reactivity';

// 1. Primitive Signal
const count = signal(0);

// 2. Computed Derivation (memoized)
const isEven = computed(() => count.value % 2 === 0);

// 3. Side Effect
const dispose = effect(() => {
  console.log(\`Count: \${count.value}, isEven: \${isEven.value}\`);
});

// 4. Batching
batch(() => {
  count.value = 2;
  count.value = 4;
}); // logs once with count: 4

// 5. Deep Proxy Store
const appState = createStore({
  user: { name: 'Alice', preferences: { darkTheme: true } }
});
appState.user.preferences.darkTheme = false; // deeply reactive!
\`\`\`

## Common Mistakes
- **Mistake**: In-place mutation (\`myArray.value.push(x)\`). This mutates the interior array without changing the signal reference and will NOT trigger reactivity.
- **Mistake**: Calling \`count()\` instead of \`count.value\`.

## Validation Instructions
Run unit tests checking signal subscriber notifications and value correctness.
`
  },

  // 5. samrey-routing
  {
    id: 'samrey-routing',
    name: 'samrey-routing',
    description: 'Implement client-side SPA routing with createRouter, RouterOutlet, Link, and route parameters.',
    content: `---
name: samrey-routing
description: Implement client-side SPA routing with createRouter, RouterOutlet, Link, and route parameters.
---

# Samrey Client-Side Routing (@samrey/router)

## Purpose
Explains how to define routes, mount the RouterOutlet outlet, create navigation links, and access dynamic route parameters.

## Relevant APIs
- \`createRouter(routes: RouteRecord[], initialPath?: string): RouterInstance\`
- \`RouterOutlet(): Node\`
- \`Link({ href, children, class, activeClass }): HTMLAnchorElement\`
- \`useParams(): ReadonlySignal<Record<string, string>>\`
- \`useLocation(): ReadonlySignal<string>\`
- \`useNavigate(): (to: string) => void\`

## Verified Code Example
\`\`\`ts
import { createRouter, RouterOutlet, Link, useParams } from '@samrey/router';
import { template, bindText } from '@samrey/runtime';

function HomePage() {
  return template('<div><h2>Welcome Home</h2></div>')();
}

function ProductPage() {
  const params = useParams();
  const root = template('<div><h2>Product Details</h2><p class="id"></p></div>')() as HTMLElement;
  bindText(root.querySelector('.id')!, () => \`Product ID: \${params.value.id || ''}\`);
  return root;
}

export const router = createRouter([
  { path: '/', component: HomePage },
  { path: '/products/:id', component: ProductPage }
]);

export function NavigationBar() {
  const nav = template('<header><nav class="nav"></nav><main></main></header>')() as HTMLElement;
  const navEl = nav.querySelector('.nav')!;
  
  navEl.appendChild(Link({ href: '/', children: 'Home' }));
  navEl.appendChild(Link({ href: '/products/101', children: 'Product #101' }));
  
  nav.querySelector('main')!.appendChild(RouterOutlet());
  return nav;
}
\`\`\`
`
  },

  // 6. samrey-http
  {
    id: 'samrey-http',
    name: 'samrey-http',
    description: 'Fetch asynchronous data with createResource and manage HTTP requests with CSRF protection.',
    content: `---
name: samrey-http
description: Fetch asynchronous data with createResource and manage HTTP requests with CSRF protection.
---

# HTTP Client & Async Resources (@samrey/http)

## Purpose
Guides asynchronous API data fetching, reactive loading/error states, and secure HTTP communication.

## Relevant APIs
- \`createResource<T>(fetcher: () => Promise<T>): [ResourceState<T>, ResourceActions<T>]\`
- \`createHttpClient(options: HttpClientOptions): HttpClient\`

## Verified Code Example
\`\`\`ts
import { createResource } from '@samrey/http';
import { Show, template, bindText, on } from '@samrey/runtime';

interface Post { id: number; title: string; }

export function PostFeed() {
  const [posts, { refetch }] = createResource<Post[]>(async () => {
    const res = await fetch('/api/posts');
    if (!res.ok) throw new Error('Failed to load posts');
    return res.json();
  });

  const root = template(\`
<div class="posts-feed">
  <button id="refetch-btn">Reload</button>
  <div id="content"></div>
</div>\`)() as HTMLElement;

  on(root.querySelector('#refetch-btn')!, 'click', () => refetch());

  root.querySelector('#content')!.appendChild(
    Show({
      when: () => posts.loading.value,
      children: () => template('<p>Loading feed...</p>')(),
      fallback: () =>
        Show({
          when: () => posts.error.value !== null,
          children: () => template('<p class="err">Error loading posts.</p>')(),
          fallback: () => {
            const list = template('<ul class="list"></ul>')() as HTMLElement;
            for (const p of posts.data.value || []) {
              const li = document.createElement('li');
              li.textContent = p.title;
              list.appendChild(li);
            }
            return list;
          }
        })
    })
  );

  return root;
}
\`\`\`
`
  },

  // 7. samrey-forms
  {
    id: 'samrey-forms',
    name: 'samrey-forms',
    description: 'Build robust reactive forms with validation schemas (Zod/Valibot) and accessible ARIA attributes.',
    content: `---
name: samrey-forms
description: Build robust reactive forms with validation schemas (Zod/Valibot) and accessible ARIA attributes.
---

# Forms & Validation (@samrey/forms)

## Purpose
Instructs how to manage form input state, dirty/touched flags, field validation, and accessible error association.

## Relevant APIs
- \`createForm<T>(config: FormConfig<T>): FormInstance<T>\`
- \`Field(props: FieldProps): Node\`
- \`useField(form: FormInstance, name: string): FieldState\`

## Verified Code Example
\`\`\`ts
import { createForm } from '@samrey/forms';
import { template, on, bindText } from '@samrey/runtime';

export function RegistrationForm() {
  const form = createForm({
    initialValues: { email: '', password: '' },
    validate: (values) => {
      const errors: Record<string, string> = {};
      if (!values.email.includes('@')) errors.email = 'Valid email is required.';
      if (values.password.length < 8) errors.password = 'Password must be at least 8 characters.';
      return errors;
    },
    onSubmit: async (values) => {
      await registerAccount(values);
    }
  });

  const root = template(\`
<form class="reg-form">
  <div class="field">
    <label for="email">Email</label>
    <input id="email" type="email" />
    <span class="err-email text-red-600 text-sm"></span>
  </div>
  <button type="submit">Register</button>
</form>\`)() as HTMLFormElement;

  const emailInput = root.querySelector('#email') as HTMLInputElement;
  const emailErr = root.querySelector('.err-email')!;

  on(emailInput, 'input', () => {
    form.setFieldValue('email', emailInput.value);
  });

  bindText(emailErr, () => form.errors.value.email || '');

  on(root, 'submit', (e) => {
    e.preventDefault();
    form.handleSubmit();
  });

  return root;
}
\`\`\`
`
  },

  // 8. samrey-ssr
  {
    id: 'samrey-ssr',
    name: 'samrey-ssr',
    description: 'Implement Server-Side Rendering (SSR), streaming responses, hydration, and static site generation (SSG).',
    content: `---
name: samrey-ssr
description: Implement Server-Side Rendering (SSR), streaming responses, hydration, and static site generation (SSG).
---

# Server-Side Rendering & Hydration (@samrey/ssr)

## Purpose
Explains how to render Samrey components on Node.js HTTP servers and hydrate them in the browser without hydration mismatches.

## Relevant APIs
- \`renderToString(rootFn: () => Node | Promise<Node>): Promise<string>\`
- \`renderToStream(rootFn: () => Node): ReadableStream\`
- \`hydrate(rootFn: () => Node, container: Element): void\`

## Server Implementation Example
\`\`\`ts
import http from 'node:http';
import { renderToString } from '@samrey/ssr';
import { App } from './src/App.js';

const server = http.createServer(async (req, res) => {
  if (req.url === '/') {
    const htmlBody = await renderToString(() => App());
    
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(\`
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <title>Samrey App</title>
  </head>
  <body>
    <div id="app">\${htmlBody}</div>
    <script type="module" src="/src/main.ts"></script>
  </body>
</html>\`);
  }
});

server.listen(3000);
\`\`\`

## Client Hydration Example
\`\`\`ts
// src/main.ts
import { hydrate } from '@samrey/ssr';
import { App } from './App.js';

const container = document.getElementById('app')!;
hydrate(() => App(), container);
\`\`\`
`
  },

  // 9. samrey-testing
  {
    id: 'samrey-testing',
    name: 'samrey-testing',
    description: 'Unit and integration test Samrey components and reactive state with @samrey/testing.',
    content: `---
name: samrey-testing
description: Unit and integration test Samrey components and reactive state with @samrey/testing.
---

# Testing Samrey Applications (@samrey/testing)

## Purpose
Teaches how to mount components into headless DOM test environments, simulate user events, and assert reactive DOM updates.

## Relevant APIs
- \`renderTest(componentFactory: () => unknown): TestRenderResult\`
- \`fireEvent(element: Element, eventName: string, eventInit?: object): boolean\`
- \`flushReactivity(): Promise<void>\`

## Verified Code Example
\`\`\`ts
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { renderTest, fireEvent, flushReactivity } from '@samrey/testing';
import { Counter } from './Counter.js';

describe('Counter Component', () => {
  it('renders initial state and increments reactively', async () => {
    const { container } = renderTest(() => Counter({ initial: 5 }));
    const button = container.querySelector('button')!;

    assert.ok(button.textContent?.includes('5'), 'Initial count must be 5');

    fireEvent(button, 'click');
    await flushReactivity();

    assert.ok(button.textContent?.includes('6'), 'Count must increment to 6');
  });
});
\`\`\`

## Validation Instructions
Run project test suites using \`npx @samrey/cli test\` or \`npm test\`.
`
  },

  // 10. samrey-debugging
  {
    id: 'samrey-debugging',
    name: 'samrey-debugging',
    description: 'Diagnose compiler errors (SAMREY-101 to SAMREY-108), reactivity pitfalls, and runtime exceptions.',
    content: `---
name: samrey-debugging
description: Diagnose compiler errors (SAMREY-101 to SAMREY-108), reactivity pitfalls, and runtime exceptions.
---

# Debugging Samrey Applications & Compiler Errors

## Purpose
Guides resolving compiler diagnostics, runtime issues, and anti-pattern warnings.

## Compiler Error Codes
- **SAMREY-101**: Unclosed HTML/JSX tag.
  - *Fix*: Check line & column reported in the error frame and add matching closing tag.
- **SAMREY-102**: Unterminated interpolation expression \`{...\`.
  - *Fix*: Ensure matching closing brace \`}\`.
- **SAMREY-104**: Mismatched or unexpected closing tag.
  - *Fix*: Match opening tag or remove extraneous closing tag.
- **SAMREY-108**: Template-level \`<Show>\` or \`<For>\` tag used in HTML template.
  - *Fix*: Call them as component functions in TypeScript: \`Show({ when, children })\` or \`For({ each, key, children })\`.

## Reactivity Debugging
- **Issue**: "Signal was updated but DOM did not change."
  - *Cause*: State was mutated in-place (e.g. \`arr.value.push(x)\`), or signal was read outside a reactive binding.
  - *Fix*: Assign new reference \`arr.value = [...arr.value, x]\` and verify binding is wrapped in a getter function \`() => signal.value\`.
- **Issue**: Infinite effect loop.
  - *Cause*: Writing to a signal inside an effect that also reads the same signal.
  - *Fix*: Wrap the read in \`untrack(() => signal.value)\`.
`
  }
];

export function installSkills(targetDir: string, force = false): string[] {
  const installedFiles: string[] = [];
  const baseDir = path.resolve(targetDir);

  for (const skill of SAMREY_SKILLS) {
    const skillDir = path.join(baseDir, skill.id);
    const skillFile = path.join(skillDir, 'SKILL.md');

    if (!force && fs.existsSync(skillFile)) {
      continue;
    }

    if (!fs.existsSync(skillDir)) {
      fs.mkdirSync(skillDir, { recursive: true });
    }

    fs.writeFileSync(skillFile, skill.content, 'utf8');
    installedFiles.push(skillFile);
  }

  return installedFiles;
}

