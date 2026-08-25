# Testing & Developer Tooling in Samrey

## 1. Testing Utilities (`@samrey/testing`)

`@samrey/testing` provides isolated component mounting harnesses, automatic microtask signal flushing, and memory leak assertion utilities.

### Component Mounting & Reactive Testing

```typescript
import { mount, flushReactivity } from '@samrey/testing';
import { signal } from '@samrey/reactivity';
import { template, bindText } from '@samrey/runtime';

function TestCounter(countSignal: any) {
  const tmpl = template(`<div>Count: <span id="count"></span></div>`);
  const root = tmpl() as HTMLElement;
  bindText(root.querySelector('#count')!, () => countSignal.value);
  return root;
}

// In test:
const count = signal(0);
const wrapper = mount(() => TestCounter(count));

count.value = 10;
flushReactivity();

assert.equal(wrapper.container.querySelector('#count')?.textContent, '10');

// Clean up reactive roots and DOM
wrapper.dispose();
```

---

## 2. Developer Tools Bridge (`@samrey/devtools`)

`@samrey/devtools` provides a lightweight, origin-gated inspection bridge for browser extensions and debugging tools.

### Features
- **Topological Graph Inspection**: Visualizes nodes, dependents, dependencies, and transaction clocks.
- **Origin-Gated Security**: Rejects unauthorized `postMessage` sources to protect runtime state from cross-origin snooping.
- **Sensitive Redaction**: Automatically redacts API keys, passwords, and tokens before telemetry serialization.

---

## 3. Command Line Interface (`@samrey/cli`)

The `@samrey/cli` package supplies scaffolding, compilation plugins, and static security/accessibility audits.

### CLI Commands

```bash
# Scaffolding
npx samrey create <project-name>
npx samrey generate component <ComponentName>
npx samrey generate route <RoutePath>
npx samrey generate store <StoreName>

# Development & Build
npx samrey dev [--port 3000]
npx samrey build
npx samrey test

# Static Security & A11y Audit
npx samrey audit [--strict]
npx samrey analyze [--json]
```

### Static Template Auditing

The `samrey audit` command scans templates for:
- Accessibility violations: Missing `alt` on `<img>`, missing form labels, invalid ARIA attributes.
- Security hazards: Unescaped interpolations in dangerous contexts, raw HTML injections without Trusted Types policies.
