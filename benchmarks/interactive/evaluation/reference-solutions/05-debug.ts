/**
 * Reference Solution: Challenge 05 - Debug an Intentionally Broken Application
 */

import { signal, computed } from '@samrey/reactivity';
import { template, on, bindText, Show, For } from '@samrey/runtime';

export interface TodoItem {
  id: number;
  text: string;
}

const _appTmpl = template(`
  <div class="todo-app">
    <h2>Todo App</h2>
    <div class="input-row">
      <input ref="input" placeholder="Add new task..." />
      <button ref="addBtn">Add</button>
    </div>
    <div class="stats">
      Total: <span ref="count"></span>
    </div>
    <div ref="contentArea"></div>
  </div>
`);

const _itemTmpl = template(
  '<li class="todo-item"><span ref="text"></span><button ref="delBtn" class="del-btn">Delete</button></li>'
);

const _emptyTmpl = template('<div ref="emptyNotice" class="empty">No tasks left!</div>');

const _listTmpl = template('<ul class="todo-list"></ul>');

export function TodoApp(): HTMLElement {
  const todos = signal<TodoItem[]>([
    { id: 1, text: 'Master Samrey Reactivity' }
  ]);

  const count = computed(() => todos.value.length);

  const root = _appTmpl.clone();
  const { input: inputEl, addBtn, count: countEl, contentArea } = root.refs;

  bindText(countEl, () => count.value.toString());

  const listElement = _listTmpl();

  const forContainer = For({
    each: () => todos.value,
    key: (item: TodoItem) => item.id,
    children: (item: TodoItem) => {
      const row = _itemTmpl.clone();
      const { text, delBtn } = row.refs;
      bindText(text, () => item.text);
      on(delBtn, 'click', () => {
        todos.update(list => list.filter(t => t.id !== item.id));
      });
      return row;
    }
  });
  listElement.appendChild(forContainer);

  const conditionalView = Show({
    when: () => todos.value.length > 0,
    children: () => listElement,
    fallback: () => _emptyTmpl()
  });

  contentArea.appendChild(conditionalView);

  const handleAdd = () => {
    const textVal = (inputEl as HTMLInputElement).value.trim();
    if (!textVal) return;
    todos.update(list => [...list, { id: Date.now(), text: textVal }]);
    (inputEl as HTMLInputElement).value = '';
  };

  on(addBtn, 'click', handleAdd);
  on(inputEl, 'keydown', (e: Event) => {
    if ((e as KeyboardEvent).key === 'Enter') {
      handleAdd();
    }
  });

  return root;
}
