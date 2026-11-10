# Samrey Template Specifications & TypeScript Integration

Samrey uses `.samrey` single-file templates compiled ahead-of-time (AOT) by `@samrey/compiler` and transformed by `@samrey/cli`'s Vite plugin.

## 1. Enabling Ambient `.samrey` Type Declarations

To import `.samrey` templates directly into TypeScript source files without `Cannot find module '*.samrey'` errors, enable `@samrey/runtime/ambient` using either of the following configurations:

### Option 1: Triple-Slash Directive (Recommended for `env.d.ts`)
Add the reference directive to your ambient environment declaration file (`src/env.d.ts` or `src/vite-env.d.ts`):

```ts
/// <reference types="@samrey/runtime/ambient" />
```

### Option 2: `tsconfig.json` Configuration
Specify `@samrey/runtime/ambient` under `compilerOptions.types` in your project's `tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "types": ["@samrey/runtime/ambient"]
  }
}
```

New projects created via `npx @samrey/cli create` configure this in `tsconfig.json` by default.

---

## 2. Template Structure & Return Types

Compiled `.samrey` component modules export a default render function:

```ts
declare module '*.samrey' {
  const template: (props?: any, scope?: any) => HTMLElement | DocumentFragment;
  export default template;
}
```

### Single-Root Templates
When a `.samrey` template has exactly one root element:
```html
<div class="user-card">
  <h2>{{ props.user.name }}</h2>
</div>
```
The render function instantiates the root element and returns an `HTMLElement`.

### Multi-Root Templates
When a `.samrey` template contains multiple top-level elements:
```html
<header class="navbar">Navigation</header>
<main class="content">Content</main>
```
The compiler clones a `DocumentFragment` wrapping the siblings, returning `DocumentFragment`.

### Type Narrowing & Usage
```ts
import UserCard from './UserCard.samrey';
import PageLayout from './PageLayout.samrey';

// Both return HTMLElement | DocumentFragment
const card: HTMLElement | DocumentFragment = UserCard({ user });
const layout: HTMLElement | DocumentFragment = PageLayout();

// Use directly in DOM mounting
document.getElementById('app')?.appendChild(card);
document.body.appendChild(layout);

// Type narrowing when fragment-specific operations are needed:
if (layout instanceof DocumentFragment) {
  console.log(`Multi-root fragment child count: ${layout.childNodes.length}`);
}
```

---

## 3. Template References (`root.refs` & `root.ref()`) — Samrey 2.1.0

Samrey 2.1.0 introduces fine-grained template references, providing direct, strongly-typed access to DOM elements without the overhead of runtime `querySelector` calls.

### A. Template Reference Syntax
Declare elements by adding a `ref="name"` attribute inside HTML string templates or `.samrey` files:

```ts
import { template, bindEvent, bindText } from '@samrey/runtime';

const view = template(`
  <form ref="form">
    <input ref="email" type="email" />
    <input ref="password" type="password" />
    <button ref="submit">Login</button>
    <p ref="message"></p>
  </form>
`);
```

### B. Four Universal Access Patterns
After cloning the template via `view.clone()` or callable `view()`:

```ts
const root = view.clone();

// 1. Direct reference collection
const { form, email, password, submit, message } = root.refs;

// 2. Destructure the refs collection
const { refs } = root;
bindEvent(refs.submit, 'click', login);
bindText(refs.message, () => status.value);

// 3. Direct property access
root.refs.email.focus();
root.refs.submit.disabled = true;

// 4. Dynamic reference access
const emailInput = root.ref('email');
const passwordInput = root.ref('password');
```
All four access patterns return the identical underlying DOM elements.

### C. Runtime Characteristics & Performance
- **O(1) Direct Path Indexing**: Element paths are computed once at master template initialization. During cloning, references resolve via direct child node array lookups, exceeding 1.6 billion property access ops/sec with zero repeated querySelector calls.
- **Instance Isolation**: Every clone creates independent DOM elements and an independent reference registry (`c1.refs.email !== c2.refs.email`).
- **Stable Identity**: Repeated access returns the exact same stable reference object (`root.refs === root.refs`).
- **Dynamic Lookup Safety**: `root.ref(name)` returns the element or `undefined` if not found.
- **Automatic Lifecycle Disposal**: When cloned inside a reactive owner (`createRoot` or component), reference metadata is automatically released upon scope disposal (`onCleanup`), or manually via `root.disposeRefs()`.

### D. Compile-Time TypeScript Inference
TypeScript template literal parsing automatically infers exact DOM element types from HTML template strings:

```ts
const root = template(`
  <input ref="email" />
  <button ref="submit"></button>
  <p ref="message"></p>
`).clone();

root.refs.email;   // Inferred as HTMLInputElement
root.refs.submit;  // Inferred as HTMLButtonElement
root.refs.message; // Inferred as HTMLParagraphElement
```
Invalid static reference names produce a compile-time TypeScript error.


