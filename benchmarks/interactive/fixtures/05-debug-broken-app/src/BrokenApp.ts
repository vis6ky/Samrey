// INTENTIONALLY BROKEN SAMREY APPLICATION FOR CHALLENGE 05
// Contains anti-patterns:
// 1. Prohibited React hooks (useState, useEffect)
// 2. Prohibited <Show> HTML tag in template string (SAMREY-108)
// 3. In-place signal mutation (.value.push())
// 4. Missing surgical bindings

// @ts-ignore - Broken imports to fix
import { useState, useEffect } from 'react';
import { signal } from '@samrey/reactivity';
import { template } from '@samrey/runtime';

export interface TodoItem {
  id: number;
  text: string;
}

export function TodoApp(): HTMLElement {
  // ANTI-PATTERN 1: React hook in Samrey
  const [inputText, setInputText] = useState('');

  // ANTI-PATTERN 2: In-place array mutation on signal
  const todos = signal<TodoItem[]>([
    { id: 1, text: 'Master Samrey Reactivity' }
  ]);

  // ANTI-PATTERN 3: <Show> tag inside template (compiler error SAMREY-108)
  const root = template(`
    <div class="todo-app">
      <h2>Todo App</h2>
      <div class="input-row">
        <input ref="input" placeholder="Add new task..." />
        <button ref="addBtn">Add</button>
      </div>
      <div class="stats">
        Total: <span ref="count"></span>
      </div>
      <Show when="todos.length > 0">
        <ul ref="list" class="todo-list"></ul>
      </Show>
      <div ref="emptyNotice" class="empty">No tasks left!</div>
    </div>
  `)();

  // ANTI-PATTERN 4: useEffect hook
  useEffect(() => {
    console.log('Todos updated');
  }, [todos]);

  const addBtn = root.querySelector('button')!;
  const inputEl = root.querySelector('input')!;

  addBtn.addEventListener('click', () => {
    // ANTI-PATTERN 5: In-place mutation doesn't trigger reactivity in Samrey
    todos.value.push({ id: Date.now(), text: inputEl.value });
    inputEl.value = '';
  });

  return root as HTMLElement;
}
