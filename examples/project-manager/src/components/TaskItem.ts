/**
 * @license Apache-2.0
 * Aether Project Manager — Task Item Component
 * Native Aether Reactive Component with status toggle, priority indicator, and optimistic updates
 */

import { el, Show, For } from '@aether/runtime';
import { Task } from '../types.js';
import { toggleTaskStatus, removeTask } from '../state.js';

export function TaskItem(props: {
  task: Task;
  onEdit?: (task: Task) => void;
}): HTMLElement {
  const { task, onEdit } = props;

  const priorityColors = {
    urgent: 'bg-rose-100 text-rose-800 border-rose-200',
    high: 'bg-orange-100 text-orange-800 border-orange-200',
    medium: 'bg-amber-100 text-amber-800 border-amber-200',
    low: 'bg-slate-100 text-slate-700 border-slate-200'
  }[task.priority] || 'bg-slate-100 text-slate-700 border-slate-200';

  const isDone = task.status === 'done';

  const row = el(
    'div',
    {
      class: `bg-white border border-slate-200 rounded-xl p-4 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-slate-300 transition-all ${
        isDone ? 'opacity-70 bg-slate-50' : ''
      }`
    },
    // Left: Checkbox & Info
    el(
      'div',
      { class: 'flex items-start gap-3 flex-1 min-w-0' },
      el('input', {
        type: 'checkbox',
        checked: isDone,
        onChange: (e: Event) => {
          const checked = (e.target as HTMLInputElement).checked;
          toggleTaskStatus(task.id, checked ? 'done' : 'in_progress');
        },
        class: 'mt-1 rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4 cursor-pointer',
        'aria-label': `Mark task ${task.title} as ${isDone ? 'incomplete' : 'complete'}`
      }),
      el(
        'div',
        { class: 'flex-1 min-w-0' },
        el(
          'div',
          { class: 'flex flex-wrap items-center gap-2 mb-1' },
          el('span', { class: `text-xs px-2 py-0.5 rounded font-mono uppercase font-bold border ${priorityColors}` }, task.priority),
          el('span', { class: 'text-xs px-2 py-0.5 rounded bg-slate-100 text-slate-600 font-mono' }, task.status.replace('_', ' ')),
          el('span', { class: 'text-xs text-slate-400 font-mono' }, `Due: ${task.dueDate}`)
        ),
        el('h4', { class: `text-sm font-bold text-slate-900 ${isDone ? 'line-through text-slate-500' : ''}` }, task.title),
        el('p', { class: 'text-xs text-slate-600 mt-0.5 line-clamp-1 leading-relaxed' }, task.description),
        // Tags
        el(
          'div',
          { class: 'flex flex-wrap gap-1 mt-2' },
          ...task.tags.map((tag) =>
            el('span', { class: 'text-xs px-1.5 py-0.2 rounded bg-indigo-50 text-indigo-700 font-mono' }, `#${tag}`)
          )
        )
      )
    ),
    // Right: Assignee & Action Buttons
    el(
      'div',
      { class: 'flex items-center justify-between sm:justify-end gap-3 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100' },
      el(
        'div',
        { class: 'text-xs text-right' },
        el('div', { class: 'text-slate-400 text-xxs font-mono' }, 'Assignee'),
        el('div', { class: 'font-semibold text-slate-700' }, task.assignee)
      ),
      el(
        'div',
        { class: 'flex items-center gap-1' },
        el(
          'button',
          {
            type: 'button',
            class: 'p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors text-xs',
            onClick: () => onEdit && onEdit(task),
            'aria-label': `Edit task ${task.title}`
          },
          '✏️'
        ),
        el(
          'button',
          {
            type: 'button',
            class: 'p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors text-xs',
            onClick: () => {
              if (confirm(`Delete task "${task.title}"?`)) {
                removeTask(task.id);
              }
            },
            'aria-label': `Delete task ${task.title}`
          },
          '🗑️'
        )
      )
    )
  );

  return row;
}
