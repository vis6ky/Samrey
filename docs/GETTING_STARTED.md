# Getting Started with Samrey

> **Samrey Framework v1.0.0-rc.1** — Fast, pure, fine-grained reactive web framework for modern TypeScript applications.

This guide walks you through bootstrapping an application with the Samrey CLI, understanding Samrey's core mental model, and building production-ready apps.

---

## 1. Creating a New Project

The official `@samrey/cli` provides instant scaffolding for various architecture patterns:

```bash
# Default Server-Side Rendering (SSR) starter
aether create my-app --template ssr

# Single-Page Application (SPA) starter
aether create my-app --template spa

# Minimal lightweight starter
aether create my-app --template minimal

# Static Site Generation (SSG) starter
aether create my-app --template ssg
```

### Navigating & Running

```bash
cd my-app
npm install

# Start development server with DevTools
npm run dev

# Run comprehensive test suite
npm run test

# Run security & accessibility audit
npm run audit

# Analyze bundle size and reactive topology
npm run analyze

# Build for production
npm run build
```

---

## 2. Core Mental Model

Samrey is architected from the ground up to eliminate runtime overhead and avoid virtual DOM diffing:

1. **Components Run Exactly Once**: A component function executes once during setup. It initializes signals, declares computed derivations, registers lifecycle hooks (`onMount`, `onCleanup`), and returns DOM nodes. Updating state **never** re-executes the component function.
2. **Fine-Grained Signal Subscriptions**: Reactive state is tracked at the property and DOM text node level. Only the exact text node or attribute that reads a signal updates when that signal changes.
3. **Pure Samrey Primitives**: Samrey uses zero external framework dependencies (no React, Vue, Angular, Svelte, Solid, Preact, etc.). Everything is powered natively by `@samrey/*` packages.
4. **Standard Schema Validation**: Form fields and validation pipelines interface natively with Standard Schema (`~standard` v1).

---

## 3. Example: Interactive Reactive Component

### JSX / TSX Syntax

```tsx
import { signal, computed } from '@samrey/reactivity';

export function UserProfile() {
  const firstName = signal('Ada');
  const lastName = signal('Lovelace');
  const fullName = computed(() => `${firstName.value} ${lastName.value}`);

  return (
    <section class="card p-4 rounded-xl border border-gray-200">
      <h2 class="text-xl font-bold">Profile: {fullName.value}</h2>
      <div class="mt-4 flex gap-2">
        <input
          type="text"
          value={firstName.value}
          onInput={(e) => { firstName.value = (e.target as HTMLInputElement).value; }}
          placeholder="First Name"
          class="border px-3 py-1 rounded"
        />
        <input
          type="text"
          value={lastName.value}
          onInput={(e) => { lastName.value = (e.target as HTMLInputElement).value; }}
          placeholder="Last Name"
          class="border px-3 py-1 rounded"
        />
      </div>
    </section>
  );
}
```

### Direct DOM (`el`) Runtime Syntax

```typescript
import { signal, computed } from '@samrey/reactivity';
import { el } from '@samrey/runtime';

export function UserProfile() {
  const firstName = signal('Ada');
  const lastName = signal('Lovelace');
  const fullName = computed(() => `${firstName.value} ${lastName.value}`);

  return el(
    'section',
    { class: 'card p-4 rounded-xl border border-gray-200' },
    el('h2', { class: 'text-xl font-bold' }, 'Profile: ', () => fullName.value),
    el(
      'div',
      { class: 'mt-4 flex gap-2' },
      el('input', {
        type: 'text',
        value: () => firstName.value,
        onInput: (e: Event) => { firstName.value = (e.target as HTMLInputElement).value; },
        placeholder: 'First Name',
        class: 'border px-3 py-1 rounded'
      }),
      el('input', {
        type: 'text',
        value: () => lastName.value,
        onInput: (e: Event) => { lastName.value = (e.target as HTMLInputElement).value; },
        placeholder: 'Last Name',
        class: 'border px-3 py-1 rounded'
      })
    )
  );
}
```

---

## 4. Documentation Index

- 📖 **[Public API Contract](./PUBLIC_API.md)** — Complete authoritative exports & type specifications for all 11 packages.
- 🚨 **[Error Codes Reference](./ERROR_CODES.md)** — Comprehensive diagnostic codes (`AETH-xxx`), explanations, and recovery guides.
- ⚡ **[Reactivity & Control Flow](./REACTIVITY_AND_CONTROL_FLOW.md)** — Deep dive into signals, effects, computed derivations, stores, `<Show>`, `<For>`, `<Switch>`.
- 🌐 **[Router & HTTP](./ROUTER_AND_HTTP.md)** — Routing, parameter signals, async resource management, and HTTP caching.
- 📝 **[Forms & Validation](./FORMS_AND_VALIDATION.md)** — Schema-driven reactive forms with Standard Schema (`~standard` v1).
- 🚀 **[SSR & Hydration](./SSR_AND_HYDRATION.md)** — Server-side rendering, streaming HTML, secret stripping, and static site generation (SSG).
- 🧪 **[Testing & Tooling](./TESTING_AND_TOOLING.md)** — Testing components, mocking resources, DevTools bridge, and CLI automation.
- 🛡️ **[Security Model](./SECURITY_MODEL.md)** — Zero-trust sanitizer, CSP compliance, and prototype pollution defense.
- 📦 **[Deployment & Packaging](./DEPLOYMENT_AND_PACKAGING.md)** — Production building, tree-shaking, and container deployment.
