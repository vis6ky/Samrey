/**
 * @license Apache-2.0
 * TaskList Component - Keyed List Rendering & Immutable State Mutations
 */

import { Signal, signal } from '@samrey/reactivity';
import { template, on, bindText, bindAttr, For } from '@samrey/runtime';

export interface Task {
  id: number;
  title: string;
  completed: boolean;
  priority: 'low' | 'medium' | 'high';
}

const _wrapperTmpl = template(`
  <section class="task-section">
    <h3>Tasks (<span class="task-count">0</span>)</h3>
    <ul class="task-list"></ul>
  </section>
`);

const _itemTmpl = template(`
  <li class="task-item">
    <label class="task-label">
      <input type="checkbox" class="task-toggle" />
      <span class="task-title"></span>
    </label>
    <span class="badge task-priority"></span>
    <button type="button" class="btn-remove">Remove</button>
  </li>
`);

const _emptyTmpl = template('<li class="task-empty">No tasks yet. Create one above!</li>');

export function TaskList(props: {
  tasks: Signal<Task[]>;
  onRemoveTask?: (id: number) => void;
  onToggleTask?: (id: number) => void;
}) {
  const root = _wrapperTmpl() as HTMLElement;
  const countEl = root.querySelector('.task-count') as HTMLElement;
  const listEl = root.querySelector('.task-list') as HTMLUListElement;

  bindText(countEl, () => props.tasks.value.length.toString());

  const listNode = For({
    each: () => props.tasks.value,
    key: (task) => task.id,
    fallback: () => _emptyTmpl(),
    children: (task) => {
      const row = _itemTmpl() as HTMLElement;
      const checkbox = row.querySelector('.task-toggle') as HTMLInputElement;
      const titleSpan = row.querySelector('.task-title') as HTMLElement;
      const priorityBadge = row.querySelector('.task-priority') as HTMLElement;
      const removeBtn = row.querySelector('.btn-remove') as HTMLButtonElement;

      checkbox.checked = task.completed;
      bindText(titleSpan, () => task.title);
      bindText(priorityBadge, () => task.priority.toUpperCase());
      bindAttr(row, 'data-completed', () => (task.completed ? 'true' : 'false'));

      on(checkbox, 'change', () => {
        if (props.onToggleTask) {
          props.onToggleTask(task.id);
        } else {
          props.tasks.update((list) =>
            list.map((t) => (t.id === task.id ? { ...t, completed: !t.completed } : t))
          );
        }
      });

      on(removeBtn, 'click', () => {
        if (props.onRemoveTask) {
          props.onRemoveTask(task.id);
        } else {
          props.tasks.update((list) => list.filter((t) => t.id !== task.id));
        }
      });

      return row;
    }
  });

  listEl.appendChild(listNode);
  return root;
}

