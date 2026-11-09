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

