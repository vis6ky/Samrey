/**
 * @license Apache-2.0
 * Samrey Project Manager — Project Detail & Task Management View
 * Native Samrey Reactive View with project-scoped tasks, status filtering, and task creation
 */

import { el, For, Show } from '@samrey/runtime';
import { store, filteredTasks } from '../state.js';
import { TaskItem } from '../components/TaskItem.js';

export function ProjectDetailView(props: {
  projectId: string;
  onNavigate: (path: string) => void;
  onOpenNewTask: () => void;
}): HTMLElement {
  const project = () => store.projects.find((p) => p.id === props.projectId);

  const view = el('div', { class: 'space-y-6 max-w-7xl mx-auto' });

  // Navigation Back Button & Header
  const header = el(
    'div',
    { class: 'space-y-4' },
    el(
      'button',
      {
        type: 'button',
        class: 'text-xs text-indigo-600 hover:text-indigo-800 font-semibold flex items-center gap-1',
        onClick: () => props.onNavigate('/projects')
      },
      '← Back to Projects'
    ),
    Show({
      when: () => !!project(),
      children: () => {
        const p = project()!;
        return el(
          'div',
          { class: 'bg-white rounded-xl border border-slate-200 p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4' },
          el(
            'div',
            { class: 'space-y-2' },
            el(
              'div',
              { class: 'flex items-center gap-2' },
              el('span', { class: 'text-xs px-2.5 py-0.5 rounded-md font-mono uppercase bg-indigo-50 text-indigo-700 border border-indigo-200' }, p.category),
              el('span', { class: 'text-xs text-slate-400 font-mono' }, `Lead: ${p.lead}`)
            ),
            el('h2', { class: 'text-2xl font-bold text-slate-900' }, p.name),
            el('p', { class: 'text-xs text-slate-600 max-w-2xl leading-relaxed' }, p.description)
          ),
          el(
            'button',
            {
              type: 'button',
              class: 'px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors self-start sm:self-auto shrink-0',
              onClick: props.onOpenNewTask
            },
            '➕ Add Task'
          )
        );
      },
      fallback: () =>
        el(
          'div',
          { class: 'p-8 text-center text-slate-500 bg-white rounded-xl border' },
          'Project not found.'
        )
    })
  );

  // Project Task Board
  const taskSection = el(
    'div',
    { class: 'space-y-4' },
    el(
      'div',
      { class: 'flex items-center justify-between' },
      el('h3', { class: 'text-base font-bold text-slate-800' }, 'Project Tasks'),
      el(
        'div',
        { class: 'flex items-center gap-2' },
        ...['all', 'todo', 'in_progress', 'done'].map((st) =>
          el(
            'button',
            {
              type: 'button',
              class: () => {
                const active = store.taskFilter.status === st;
                return active
                  ? 'px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-900 text-white'
                  : 'px-2.5 py-1 rounded-lg text-xs text-slate-600 bg-slate-100 hover:bg-slate-200';
              },
              onClick: () => {
                store.taskFilter.status = st;
              }
            },
            st.replace('_', ' ')
          )
        )
      )
    ),
    // Task List
    el(
      'div',
      { class: 'space-y-3' },
      For({
        each: () => filteredTasks.value.filter((t) => t.projectId === props.projectId),
        children: (task) => TaskItem({ task })
      })
    )
  );

  view.appendChild(header);
  view.appendChild(taskSection);

  return view;
}
