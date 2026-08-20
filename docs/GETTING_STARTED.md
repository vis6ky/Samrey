# Getting Started with Aether

This guide will walk you through setting up a new Aether application from scratch or integrating Aether packages into an existing TypeScript project.

---

## 1. Creating a New Project

The easiest way to bootstrap a production-ready Aether project is with the official `@aether/cli`:

```bash
# Create a new project
npx @aether/cli create my-aether-app

# Navigate to project directory
cd my-aether-app

# Install dependencies
npm install

# Start development server
npm run dev
```

The starter template includes:
- Vite with `@aether/cli` plugin for automatic template compilation
- Isomorphic SSR and client hydration scaffolding
- Fine-grained signal reactivity
- TypeScript 5.8+ configuration
- Pre-configured test suite using Node.js native runner

---

## 2. Core Concepts

Aether differs fundamentally from component-rerender frameworks (like React):

1. **Components Run Exactly Once**: A component function executes once during initial setup. It creates signals, defines computations, and returns the DOM tree. Re-evaluating state *never* re-runs the component body.
2. **Signals Are Not Hooks**: Signals can be declared anywhere—inside components, inside custom hooks, or as global module-level stores. They do not depend on call order or rendering context.
3. **Direct DOM Binding**: State changes update only the specific DOM text node or attribute linked to the changed signal, without Virtual DOM diffing or tree reconciliation.

---

## 3. Basic Example Walkthrough

```typescript
import { signal, computed, effect } from '@aether/reactivity';
import { template, bindText, bindEvent } from '@aether/runtime';

export function UserProfile() {
  const firstName = signal('Grace');
  const lastName = signal('Hopper');
  const fullName = computed(() => `${firstName.value} ${lastName.value}`);

  const tmpl = template(`
    <section class="card">
      <h2>Profile: <span id="full-name"></span></h2>
      <input type="text" id="fn-input" placeholder="First Name" />
      <input type="text" id="ln-input" placeholder="Last Name" />
    </section>
  `);

  const root = tmpl() as HTMLElement;
  const nameSpan = root.querySelector('#full-name')!;
  const fnInput = root.querySelector('#fn-input') as HTMLInputElement;
  const lnInput = root.querySelector('#ln-input') as HTMLInputElement;

  // Bind reactive text
  bindText(nameSpan, () => fullName.value);

  // Bind inputs
  bindEvent(fnInput, 'input', (e) => {
    firstName.value = (e.target as HTMLInputElement).value;
  });
  bindEvent(lnInput, 'input', (e) => {
    lastName.value = (e.target as HTMLInputElement).value;
  });

  return root;
}
```

---

## 4. Next Steps

- Explore [Reactivity & Control Flow](./REACTIVITY_AND_CONTROL_FLOW.md)
- Learn about [Templates & Components](./TEMPLATES_AND_COMPONENTS.md)
- Set up [Server-Side Rendering & Hydration](./SSR_AND_HYDRATION.md)
- Read the complete [API Reference](./API_REFERENCE.md)
