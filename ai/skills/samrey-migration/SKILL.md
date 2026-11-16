---
name: samrey-migration
description: Migrating code from React, Vue, Solid, and Svelte to native Samrey idioms without foreign framework dependencies.
---

# Migrating to Samrey Framework (`samrey-migration`)

## 1. Skill Description & Activation Criteria
- **Purpose**: Provides automated and manual translation rules for converting components and state management from React, Vue, Solid, and Svelte into native Samrey.
- **Activation Criteria**: Trigger when refactoring existing projects into Samrey, converting React JSX components, translating hooks, or porting third-party UI patterns.

## 2. Framework Comparison & Translation Map

| Foreign Pattern | Framework | Samrey Native Equivalent |
| :--- | :--- | :--- |
| `const [x, setX] = useState(0)` | React | `const x = signal(0);` (read: `x.value`, write: `x.value = v`) |
| `useEffect(() => { ... }, [dep])` | React | `effect(() => { ... });` (auto-subscribes to read signals) |
| `useMemo(() => fn, [dep])` | React | `const derived = computed(() => fn);` |
| `useRef(null)` | React | Template references: `template('<div ref="myRef"></div>').clone().refs.myRef` |
| `<Show when={c}>` (JSX tag) | Solid | `Show({ when: () => c.value, children: () => View() })` (TS function) |
| `<For each={items}>` (JSX tag) | Solid | `For({ each: () => items.value, key: i => i.id, children: (item) => Row(item) })` |
| `ref(0)` / `reactive({})` | Vue | `signal(0)` / `createStore({})` |
| `v-if="condition"` | Vue | `Show({ when: () => condition.value, children: () => View() })` |
| `v-for="item in items"` | Vue | `For({ each: () => items.value, key: i => i.id, children: ... })` |

## 3. Correct API Usage & Migration Walkthrough

### React Component Migration
**React Source (Before):**
```tsx
import React, { useState } from 'react';

export function Counter() {
  const [count, setCount] = useState(0);
  return (
    <button onClick={() => setCount(count + 1)}>
      Count: {count}
    </button>
  );
}
```

**Samrey Native (After):**
```ts
import { signal } from '@samrey/reactivity';
import { template, bindText, on } from '@samrey/runtime';

const _tmpl = template('<button ref="btn">Count: <span ref="num"></span></button>');

export function Counter() {
  const count = signal(0);
  const root = _tmpl.clone();
  const { btn, num } = root.refs;

  bindText(num, () => count.value.toString());
  on(btn, 'click', () => count.update(n => n + 1));

  return root;
}
```

## 4. Key Architectural Shifts
1. **One-Time Execution**: Understand that the function body does NOT re-run. State variables and helper objects are allocated only once.
2. **Getter Wrapping**: Dynamic values passed to `bindText`, `bindAttr`, `Show.when`, etc., must be functions (`() => expr`) so the reactive runtime can subscribe to signal reads.

## 5. Common Migration Pitfalls
- **Pitfall**: Leaving React imports (`import React from 'react'`).
  - *Correction*: Delete all foreign imports; Samrey is completely self-contained.
- **Pitfall**: Invoking signals as functions (`count()` like Solid).
  - *Correction*: Access the `.value` property (`count.value`).

## 6. Forbidden Patterns
- ❌ Do NOT try to simulate React hooks with custom hook closures.
- ❌ Do NOT use virtual DOM render props.

## 7. Validation Procedures
1. Run `npx @samrey/cli check --json` to detect unconverted React hooks or syntax errors.
2. Run `npm test` to verify behavior.

## 8. Authoritative Documentation
- [ai/SPEC.md](../../SPEC.md)
- [ai/REACTIVITY_RULES.md](../../REACTIVITY_RULES.md)
- [ai/COMPONENT_RULES.md](../../COMPONENT_RULES.md)
