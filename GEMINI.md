# GEMINI INSTRUCTIONS — SAMREY FRAMEWORK

You are developing applications using **Samrey**, an independent high-performance reactive web framework.
Follow these mandatory guidelines when analyzing, generating, or debugging Samrey code.

# Samrey Framework — Universal AI Development Instructions

## 1. What is Samrey?
Samrey is an independent, compile-time reactive frontend framework engineered for high performance.
- **Zero Virtual DOM**: Components run **EXACTLY ONCE** during creation. There is no VDOM diffing or reconciliation pass.
- **Compile-Time Static Hoisting**: Invariant HTML markup is hoisted into `template("...")` cloning operations (`_tmpl$1 = template("<div>...</div>")`).
- **Surgical Fine-Grained Bindings**: State changes trigger microscopic surgical DOM updates (`bindText`, `bindAttr`, `on`) without re-running component functions.
- **Pure Signals**: Reactive state is managed via `signal()`, `computed()`, `effect()`, and `createStore()` from `@samrey/reactivity`.

---

## 2. Prohibited Foreign Framework Idioms (STRICT)
- ❌ **NEVER use React hooks** (`useState`, `useEffect`, `useMemo`, `useCallback`, `useRef`, `useContext`). Samrey is NOT React.
- ❌ **NEVER mutate signal arrays or objects in-place** (e.g. `todos.value.push(x)` will NOT trigger reactivity). Always reassign a new reference: `todos.value = [...todos.value, x]` or use `todos.update(arr => [...arr, x])`.
- ❌ **NEVER write `<Show>` or `<For>` as template HTML tags** in string templates or raw HTML (this triggers compiler error `SAMREY-108`).
- ❌ **NEVER import React or Vue libraries**.

---

## 3. Core Development Workflows & Real APIs

### A. Creating an Application
```bash
# Create a new production Samrey app
npx @samrey/cli create my-app --template ssr
cd my-app
npm install
npm run dev
```

### B. Reactive State & Computations
```ts
import { signal, computed, effect, batch } from '@samrey/reactivity';

// 1. Primitive Signal
const count = signal(0);
console.log(count.value); // Read with .value
count.value++;            // Write with .value =
count.set(10);           // Or .set()
count.update(n => n + 1); // Or .update()

// 2. Derived Computed Value
const double = computed(() => count.value * 2);

// 3. Side Effects
effect(() => {
  console.log(`Current count is ${count.value}, double is ${double.value}`);
});

// 4. Batching Multiple Mutations
batch(() => {
  count.value = 100;
  // effects run once after batch completes
});
```

### C. Creating Components & Surgical DOM Bindings
```ts
import { signal } from '@samrey/reactivity';
import { template, on, bindText } from '@samrey/runtime';

// Hoisted static template with Template References (Samrey 2.1.0)
const _tmpl = template('<button ref="btn" class="btn">Count: <span ref="num" class="num"></span></button>');

export function Counter(props: { initial?: number }) {
  const count = signal(props.initial ?? 0);
  const root = _tmpl.clone();
  const { btn, num } = root.refs;

  // Surgical text node update — only this span updates when count changes
  bindText(num, () => count.value.toString());

  // Event handler
  on(btn, 'click', () => count.update(n => n + 1));

  return root;
}
```

### D. Conditional Rendering (`Show`)
```ts
import { signal } from '@samrey/reactivity';
import { Show, template } from '@samrey/runtime';

const _userTmpl = template('<div class="profile">Welcome, User!</div>');
const _guestTmpl = template('<div class="guest">Please sign in.</div>');

export function AuthSection() {
  const isAuth = signal(false);

  return Show({
    when: () => isAuth.value,
    children: () => _userTmpl(),
    fallback: () => _guestTmpl()
  });
}
```

### E. List Rendering (`For`)
```ts
import { signal } from '@samrey/reactivity';
import { For, template, bindText } from '@samrey/runtime';

interface Item { id: number; name: string; }

const _itemTmpl = template('<li class="item-row"><span class="txt"></span></li>');

export function ItemList() {
  const items = signal<Item[]>([
    { id: 1, name: 'Item Alpha' },
    { id: 2, name: 'Item Beta' }
  ]);

  return For({
    each: () => items.value,
    key: (item) => item.id,
    children: (item) => {
      const row = _itemTmpl() as HTMLElement;
      bindText(row.querySelector('.txt')!, () => item.name);
      return row;
    }
  });
}
```

### F. Client-Side Routing
```ts
import { createRouter, RouterOutlet, Link, useParams } from '@samrey/router';
import { template } from '@samrey/runtime';

function Home() { return template('<div>Home Page</div>')(); }
function Dashboard() { return template('<div>Dashboard Page</div>')(); }

export const router = createRouter([
  { path: '/', component: Home },
  { path: '/dashboard', component: Dashboard }
]);

export function Navigation() {
  const nav = template('<nav><div class="nav-links"></div><main></main></nav>')() as HTMLElement;
  nav.querySelector('.nav-links')!.appendChild(Link({ href: '/', children: 'Home' }));
  nav.querySelector('.nav-links')!.appendChild(Link({ href: '/dashboard', children: 'Dashboard' }));
  nav.querySelector('main')!.appendChild(RouterOutlet());
  return nav;
}
```

### G. Async Data Fetching (`createResource`)
```ts
import { createResource } from '@samrey/http';
import { Show, template, bindText } from '@samrey/runtime';

export function UserList() {
  const [users] = createResource(async () => {
    const res = await fetch('/api/users');
    return res.json();
  });

  return Show({
    when: () => users.loading.value,
    children: () => template('<div>Loading users...</div>')(),
    fallback: () => template('<div>Data loaded!</div>')()
  });
}
```

### H. Forms & Validation
```ts
import { createForm } from '@samrey/forms';

const form = createForm({
  initialValues: { email: '', password: '' },
  validate: (values) => {
    const errors: Record<string, string> = {};
    if (!values.email.includes('@')) errors.email = 'Valid email is required';
    return errors;
  },
  onSubmit: async (values) => {
    await login(values);
  }
});
```

### I. Component Unit Testing
```ts
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { renderTest, fireEvent, flushReactivity } from '@samrey/testing';
import { Counter } from './Counter.js';

describe('Counter', () => {
  it('increments count on click', async () => {
    const { container } = renderTest(() => Counter({ initial: 0 }));
    const btn = container.querySelector('button')!;
    fireEvent(btn, 'click');
    await flushReactivity();
    assert.ok(btn.textContent?.includes('1'));
  });
});
```

### J. Production Build & Quality Auditing
```bash
# Run security & a11y audit
npx @samrey/cli audit

# Run test suite
npx @samrey/cli test

# Build production bundle
npx @samrey/cli build

# Inspect bundle file sizes
npx @samrey/cli analyze
```

