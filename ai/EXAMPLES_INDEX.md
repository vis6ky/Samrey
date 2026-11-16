# Samrey Framework — Verified Examples Index (EXAMPLES_INDEX.md)

**Version:** 2.1.0  
**Authority:** Verified Production Examples Catalog for AI Agents

---

## 1. Quick Reference: Common Application Patterns

| Pattern | Key Packages | Description |
| :--- | :--- | :--- |
| **Simple Counter** | `@samrey/reactivity`, `@samrey/runtime` | Static template hoisting with surgical number update |
| **Live Search with Debounce** | `@samrey/reactivity`, `@samrey/runtime`, `@samrey/http` | Async reactive resource loading with debounced inputs |
| **Keyed Dynamic List** | `@samrey/reactivity`, `@samrey/runtime` | Efficient list rendering with `For()` and surgical deletion |
| **Accessible Form with Validation** | `@samrey/forms`, `@samrey/runtime` | Standard Schema validation, ARIA state, submit deduplication |
| **Client-Side SPA Routing** | `@samrey/router`, `@samrey/runtime` | Multi-view navigation with `createRouter`, `RouterOutlet`, `Link` |
| **Full-Stack SSR with Hydration** | `@samrey/ssr`, `@samrey/runtime` | Server streaming HTML, pre-hydration script, client `hydrate()` |
| **Unit Testing Component** | `@samrey/testing` | Headless DOM test with `renderTest`, `fireEvent`, `flushReactivity` |

---

## 2. Example 1: Simple Counter
```ts
import { signal } from '@samrey/reactivity';
import { template, bindText, on } from '@samrey/runtime';

const _tmpl = template('<button class="btn">Count: <span ref="num"></span></button>');

export function Counter(props: { initial?: number }) {
  const count = signal(props.initial ?? 0);
  const root = _tmpl.clone();

  bindText(root.refs.num, () => count.value.toString());
  on(root, 'click', () => count.update(n => n + 1));

  return root;
}
```

---

## 3. Example 2: Live Search Box
```ts
import { signal } from '@samrey/reactivity';
import { template, bindText, on, Show, For } from '@samrey/runtime';
import { createResource } from '@samrey/http';

const _searchTmpl = template(`
  <div class="search-widget">
    <input ref="input" type="text" placeholder="Search..." />
    <div ref="status" class="status"></div>
    <ul ref="results" class="results-list"></ul>
  </div>
`);

export function SearchWidget() {
  const query = signal('');
  const root = _searchTmpl.clone();
  const { input, status, results } = root.refs;

  let timer: any;
  on(input, 'input', (e: Event) => {
    clearTimeout(timer);
    timer = setTimeout(() => {
      query.value = (e.target as HTMLInputElement).value;
    }, 300);
  });

  const [data] = createResource(
    () => query.value,
    async (q) => {
      if (!q) return [];
      const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`);
      return res.json();
    }
  );

  status.appendChild(
    Show({
      when: () => data.loading.value,
      children: () => template('<span>Searching...</span>')(),
      fallback: () => template('<span>Ready</span>')()
    })
  );

  results.appendChild(
    For({
      each: () => data.value ?? [],
      key: (item: any) => item.id,
      children: (item: any) => {
        const li = template('<li></li>')() as HTMLElement;
        li.textContent = item.title;
        return li;
      }
    })
  );

  return root;
}
```

---

## 4. Example 3: Accessible Form Validation
```ts
import { createForm, bindField, computeAriaAttributes } from '@samrey/forms';
import { template, bindText, on } from '@samrey/runtime';

const _formTmpl = template(`
  <form class="auth-form" novalidate>
    <div class="form-group">
      <label for="email">Email</label>
      <input id="email" ref="emailInput" type="email" />
      <span ref="emailError" class="error-msg"></span>
    </div>
    <button ref="submitBtn" type="submit">Submit</button>
  </form>
`);

export function LoginForm(props: { onSubmit: (data: { email: string }) => Promise<void> }) {
  const form = createForm({
    initialValues: { email: '' },
    validate: (values) => {
      const errors: Record<string, string> = {};
      if (!values.email.includes('@')) {
        errors.email = 'Please provide a valid email address.';
      }
      return errors;
    },
    onSubmit: props.onSubmit
  });

  const root = _formTmpl.clone();
  const { emailInput, emailError, submitBtn } = root.refs;

  // Bind input field to form instance
  bindField(emailInput as HTMLInputElement, form, 'email');

  // Bind error message dynamically
  bindText(emailError, () => form.errors.value.email ?? '');

  on(root, 'submit', (e) => {
    e.preventDefault();
    form.handleSubmit();
  });

  return root;
}
```
