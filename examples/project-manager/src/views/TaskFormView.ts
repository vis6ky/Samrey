/**
 * @license Apache-2.0
 * Gati Project Manager — Unified Task Board View
 * Native Gati View with multi-column status lanes, priority filters, and search
 */

import { el, For, Show } from '@gati/runtime';
import { store, filteredTasks } from '../state.js';
import { TaskItem } from '../components/TaskItem.js';
import { TaskStatus } from '../types.js';

export function TaskBoardView(props: {
  onOpenNewTask: () => void;
}): HTMLElement {
  const view = el('div', { class: 'space-y-6 max-w-7xl mx-auto' });

  // Header & Controls
  const header = el(
    'div',
    { class: 'flex flex-col sm:flex-row sm:items-center justify-between gap-4' },
    el(
      'div',
      null,
      el('h2', { class: 'text-2xl font-bold text-slate-900 tracking-tight' }, 'Task Management Board'),
      el('p', { class: 'text-xs text-slate-500 mt-1' }, 'Fine-grained task workflows across all active project modules.')
    ),
    el(
      'button',
      {
        type: 'button',
        class: 'px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors flex items-center gap-1.5 self-start sm:self-auto',
        onClick: props.onOpenNewTask
      },
      '➕ Add Task'
    )
  );

  // Filters Bar
  const filtersBar = el(
    'div',
    { class: 'bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-4' },
    // Status Pills
    el(
      'div',
      { class: 'flex flex-wrap items-center gap-1.5' },
      ...['all', 'todo', 'in_progress', 'review', 'done'].map((st) =>
        el(
          'button',
          {
            type: 'button',
            class: () => {
              const active = store.taskFilter.status === st;
              const base = 'px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-colors';
              return active
                ? `${base} bg-indigo-600 text-white shadow-xs`
                : `${base} bg-slate-100 text-slate-600 hover:bg-slate-200`;
            },
            onClick: () => {
              store.taskFilter.status = st;
            }
          },
          st.replace('_', ' ')
        )
      )
    ),
    // Priority and Sorting Selects
    el(
      'div',
      { class: 'flex items-center gap-3' },
      el(
        'select',
        {
          class: 'text-xs bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500',
          onChange: (e: Event) => {
            store.taskFilter.priority = (e.target as HTMLSelectElement).value;
          }
        },
        el('option', { value: 'all' }, 'All Priorities'),
        el('option', { value: 'urgent' }, 'Urgent'),
        el('option', { value: 'high' }, 'High'),
        el('option', { value: 'medium' }, 'Medium'),
        el('option', { value: 'low' }, 'Low')
      ),
      el(
        'select',
        {
          class: 'text-xs bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500',
          onChange: (e: Event) => {
            store.taskFilter.sortBy = (e.target as HTMLSelectElement).value as any;
          }
        },
        el('option', { value: 'dueDate' }, 'Sort by Due Date'),
        el('option', { value: 'priority' }, 'Sort by Priority'),
        el('option', { value: 'title' }, 'Sort by Title')
      )
    )
  );

  // Kanban Lane Columns
  const lanes: Array<{ id: TaskStatus; title: string; icon: string; color: string }> = [
    { id: 'todo', title: 'To Do', icon: '📝', color: 'border-slate-300' },
    { id: 'in_progress', title: 'In Progress', icon: '⚡', color: 'border-amber-400' },
    { id: 'review', title: 'Under Review', icon: '👀', color: 'border-purple-400' },
    { id: 'done', title: 'Completed', icon: '✓', color: 'border-emerald-400' }
  ];

  const kanbanBoard = el(
    'div',
    { class: 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 items-start' },
    ...lanes.map((lane) => {
      const laneTasks = () => filteredTasks.value.filter((t) => t.status === lane.id);

      return el(
        'div',
        { class: `bg-slate-100/80 rounded-2xl p-4 border-t-4 border ${lane.color} flex flex-col space-y-3 min-h-[400px]` },
        // Lane Header
        el(
          'div',
          { class: 'flex items-center justify-between' },
          el(
            'div',
            { class: 'flex items-center gap-2' },
            el('span', null, lane.icon),
            el('h4', { class: 'text-xs font-bold text-slate-800 uppercase tracking-wider' }, lane.title)
          ),
          el(
            'span',
            { class: 'text-xs font-mono px-2 py-0.5 rounded-full bg-white text-slate-700 border border-slate-200' },
            () => String(laneTasks().length)
          )
        ),
        // Lane Items
        el(
          'div',
          { class: 'space-y-3 flex-1 overflow-y-auto' },
          For({
            each: laneTasks,
            children: (task) => TaskItem({ task })
          })
        )
      );
    })
  );

  view.appendChild(header);
  view.appendChild(filtersBar);
  view.appendChild(kanbanBoard);

  return view;
}
