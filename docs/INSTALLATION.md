# Samrey Framework — Installation & Quickstart

**Target Version:** 1.0.0-rc.1  
**License:** Apache-2.0  

---

## 1. Quickstart via CLI Scaffolding

To create a new Samrey application, run the official CLI tool:

```bash
# Using npm
npm create aether@rc my-app

# Or using npx directly
npx @samrey/cli@rc create my-app --template spa
```

### Available Starter Templates
- `minimal` — Ultra-lightweight reactive DOM starter
- `spa` — Single-page application with `@samrey/router` and client navigation
- `ssr` — Server-side rendering with `@samrey/ssr` and hydration
- `ssg` — Static site generation for pre-rendered multi-page sites

---

## 2. Manual Package Installation

You can install individual `@samrey/*` modules into any existing modern JavaScript/TypeScript project:

```bash
# Core reactive runtime
npm install @samrey/reactivity@rc @samrey/runtime@rc @samrey/security@rc

# Routing, Forms, and HTTP
npm install @samrey/router@rc @samrey/forms@rc @samrey/http@rc

# Server-Side Rendering
npm install @samrey/ssr@rc

# Tooling and CLI
npm install -D @samrey/cli@rc @samrey/compiler@rc @samrey/testing@rc
```

---

## 3. Minimal Application Example

Create `index.ts`:

```typescript
import { signal, computed } from '@samrey/reactivity';
import { el, mount } from '@samrey/runtime';

function Counter() {
  const count = signal(0);
  const doubled = computed(() => count.value * 2);

  return el('div', { class: 'counter-card' }, [
    el('h1', {}, 'Samrey Counter'),
    el('p', {}, () => `Count: ${count.value} (Doubled: ${doubled.value})`),
    el('button', {
      onclick: () => count.value++
    }, 'Increment')
  ]);
}

mount(Counter, document.getElementById('root')!);
```

---

## 4. Vite Bundler Setup

Add `@samrey/cli/vite-plugin` to your `vite.config.ts`:

```typescript
import { defineConfig } from 'vite';
import { aetherVitePlugin } from '@samrey/cli';

export default defineConfig({
  plugins: [aetherVitePlugin()]
});
```
