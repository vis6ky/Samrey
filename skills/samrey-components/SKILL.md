---
name: samrey-components
description: Authoring UI components, static template hoisting, template references, surgical bindings, and control flow in @samrey/runtime.
---

# Samrey Components & Surgical DOM Bindings (`samrey-components`)

## 1. Skill Description & Activation Criteria
- **Purpose**: Teaches how to build native Samrey components returning real DOM nodes with fine-grained surgical bindings.
- **Activation Criteria**: Trigger when building UI elements, pages, layout widgets, control flow branches (`Show`, `For`), or binding DOM properties.

## 2. Framework Concepts
- **Static Template Hoisting**: `template('...')` is declared once at module scope.
- **Template References**: Elements flagged with `ref="id"` are looked up in $O(1)$ from `root.refs.id`.
- **Micro-Bindings**: `bindText`, `bindAttr`, `bindClass`, `bindStyle`, `on`.
- **Function-Based Control Flow**: `Show`, `Switch`, `Match`, and `For` are component functions, never HTML tags.

## 3. Correct API Usage
```ts
import { template, bindText, bindClass, on, Show, For } from '@samrey/runtime';
import { signal } from '@samrey/reactivity';

const _tmpl = template('<div ref="box" class="card"><span ref="txt"></span></div>');

export function Card() {
  const active = signal(false);
  const root = _tmpl.clone();
  const { box, txt } = root.refs;

  bindClass(box, 'active', () => active.value);
  bindText(txt, () => active.value ? 'Active' : 'Inactive');
  on(box, 'click', () => active.update(v => !v));

  return root;
}
```

## 4. Verified Code Example
```ts
import { signal } from '@samrey/reactivity';
import { template, bindText, on, For } from '@samrey/runtime';

interface Todo { id: number; text: string; done: boolean; }

const _todoTmpl = template('<li class="todo"><span ref="title"></span><button ref="delBtn">✕</button></li>');

export function TodoList() {
  const todos = signal<Todo[]>([
    { id: 1, text: 'Master Samrey', done: true }
  ]);

  return For({
    each: () => todos.value,
    key: (item) => item.id,
    children: (item) => {
      const row = _todoTmpl.clone();
      const { title, delBtn } = row.refs;

      bindText(title, () => item.text);
      on(delBtn, 'click', () => {
        todos.update(list => list.filter(t => t.id !== item.id));
      });

      return row;
    }
  });
}
```

## 5. Common Mistakes
- **Mistake**: Writing `<Show>` as raw HTML template text.
  - *Correction*: Invoke `Show({ when: () => cond.value, children: () => View() })` in TypeScript.
- **Mistake**: Passing static string rather than a getter to `bindText`.
  - *Correction*: Always pass a reactive getter callback: `bindText(el, () => signal.value)`.

## 6. Forbidden Patterns
- ❌ Do NOT emit `<Show>` or `<For>` inside `template('...')`.
- ❌ Do NOT use `innerHTML` directly with user input.

## 7. Validation Procedures
1. Run `npx @samrey/cli test` to verify component rendering and assertions.
2. Check for `SAMREY-108` violations with `npx @samrey/cli check`.

## 8. Authoritative Documentation
- [ai/COMPONENT_RULES.md](../../COMPONENT_RULES.md)
- [ai/API_CONTRACTS.md](../../API_CONTRACTS.md#2-samreyruntime)
