# Gati Framework — Installation & Quickstart

**Target Version:** 1.0.0-rc.1  
**License:** Apache-2.0  

---

## 1. Quickstart via CLI Scaffolding

To create a new Gati application, run the official CLI tool:

```bash
# Using npm
npm create aether@rc my-app

# Or using npx directly
npx @gati/cli@rc create my-app --template spa
```

### Available Starter Templates
- `minimal` — Ultra-lightweight reactive DOM starter
- `spa` — Single-page application with `@gati/router` and client navigation
- `ssr` — Server-side rendering with `@gati/ssr` and hydration
- `ssg` — Static site generation for pre-rendered multi-page sites

---

## 2. Manual Package Installation

You can install individual `@gati/*` modules into any existing modern JavaScript/TypeScript project:

```bash
# Core reactive runtime
npm install @gati/reactivity@rc @gati/runtime@rc @gati/security@rc

# Routing, Forms, and HTTP
npm install @gati/router@rc @gati/forms@rc @gati/http@rc

# Server-Side Rendering
npm install @gati/ssr@rc

# Tooling and CLI
npm install -D @gati/cli@rc @gati/compiler@rc @gati/testing@rc
```

---

## 3. Minimal Application Example

Create `index.ts`:

```typescript
import { signal, computed } from '@gati/reactivity';
import { el, mount } from '@gati/runtime';

function Counter() {
  const count = signal(0);
  const doubled = computed(() => count.value * 2);

  return el('div', { class: 'counter-card' }, [
    el('h1', {}, 'Gati Counter'),
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

Add `@gati/cli/vite-plugin` to your `vite.config.ts`:

```typescript
import { defineConfig } from 'vite';
import { aetherVitePlugin } from '@gati/cli';

export default defineConfig({
  plugins: [aetherVitePlugin()]
});
```
