/**
 * @license Apache-2.0
 * Samrey Project Manager — Dashboard Overview View
 * Native Samrey Runtime View with computed metrics and reactive summaries
 */

import { el, For, Show } from '@samrey/runtime';
import { store, projectMetrics, filteredTasks } from '../state.js';
import { ProjectCard } from '../components/ProjectCard.js';
import { TaskItem } from '../components/TaskItem.js';

export function DashboardView(props: {
  onNavigate: (path: string) => void;
  onOpenNewProject: () => void;
  onOpenNewTask: () => void;
}): HTMLElement {
  const view = el('div', { class: 'space-y-6 max-w-7xl mx-auto' });

  // Welcome Header & Actions
  const header = el(
    'div',
    { class: 'flex flex-col sm:flex-row sm:items-center justify-between gap-4' },
    el(
      'div',
      null,
      el('h2', { class: 'text-2xl font-bold text-slate-900 tracking-tight' }, 'Project Portfolio & Health'),
      el('p', { class: 'text-xs text-slate-500 mt-1' }, 'Unified overview of active projects, fine-grained tasks, and ecosystem telemetry.')
    ),
    el(
      'div',
      { class: 'flex items-center gap-2' },
      el(
        'button',
        {
          type: 'button',
          class: 'px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors flex items-center gap-1.5',
          onClick: props.onOpenNewProject
        },
        '➕ New Project'
      ),
      el(
        'button',
        {
          type: 'button',
          class: 'px-3 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors flex items-center gap-1.5',
          onClick: props.onOpenNewTask
        },
        '📋 New Task'
      )
    )
  );

  // Metrics Grid
  const metricsGrid = el(
    'div',
    { class: 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4' },
    // Metric 1: Total Projects
    el(
      'div',
      { class: 'bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between' },
      el(
        'div',
        null,
        el('div', { class: 'text-xs text-slate-500 font-medium' }, 'Active Projects'),
        el('div', { class: 'text-2xl font-bold text-slate-900 mt-1' }, () => String(projectMetrics.value.totalProjects))
      ),
      el('div', { class: 'w-10 h-10 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center text-lg' }, '📁')
    ),
    // Metric 2: Total Tasks
    el(
      'div',
      { class: 'bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between' },
      el(
        'div',
        null,
        el('div', { class: 'text-xs text-slate-500 font-medium' }, 'Total Tasks'),
        el('div', { class: 'text-2xl font-bold text-slate-900 mt-1' }, () => String(projectMetrics.value.totalTasks))
      ),
      el('div', { class: 'w-10 h-10 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center text-lg' }, '📋')
    ),
    // Metric 3: In Progress
    el(
      'div',
      { class: 'bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between' },
      el(
        'div',
        null,
        el('div', { class: 'text-xs text-slate-500 font-medium' }, 'In Progress'),
        el('div', { class: 'text-2xl font-bold text-amber-600 mt-1' }, () => String(projectMetrics.value.inProgressTasks))
      ),
      el('div', { class: 'w-10 h-10 rounded-lg bg-sky-50 text-sky-600 flex items-center justify-center text-lg' }, '⚡')
    ),
    // Metric 4: Completion Rate
    el(
      'div',
      { class: 'bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between' },
      el(
        'div',
        null,
        el('div', { class: 'text-xs text-slate-500 font-medium' }, 'Completion Rate'),
        el('div', { class: 'text-2xl font-bold text-emerald-600 mt-1' }, () => `${projectMetrics.value.completionRate}%`)
      ),
      el('div', { class: 'w-10 h-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center text-lg' }, '✓')
    )
  );

  // Main Section: Recent Projects & Urgent Tasks
  const mainGrid = el(
    'div',
    { class: 'grid grid-cols-1 lg:grid-cols-3 gap-6' },
    // Left (2 cols): Projects
    el(
      'div',
      { class: 'lg:col-span-2 space-y-4' },
      el(
        'div',
        { class: 'flex items-center justify-between' },
        el('h3', { class: 'text-sm font-bold text-slate-800' }, 'Featured Projects'),
        el(
          'button',
          {
            type: 'button',
            class: 'text-xs text-indigo-600 hover:text-indigo-800 font-semibold',
            onClick: () => props.onNavigate('/projects')
          },
          'View All →'
        )
      ),
      el(
        'div',
        { class: 'grid grid-cols-1 sm:grid-cols-2 gap-4' },
        For({
          each: () => store.projects.slice(0, 4),
          children: (project) =>
            ProjectCard({
              project,
              onSelect: (id) => props.onNavigate(`/projects?id=${id}`)
            })
        })
      )
    ),
    // Right (1 col): Urgent / In Progress Tasks
    el(
      'div',
      { class: 'space-y-4' },
      el(
        'div',
        { class: 'flex items-center justify-between' },
        el('h3', { class: 'text-sm font-bold text-slate-800' }, 'Priority Tasks'),
        el(
          'button',
          {
            type: 'button',
            class: 'text-xs text-indigo-600 hover:text-indigo-800 font-semibold',
            onClick: () => props.onNavigate('/tasks')
          },
          'Full Board →'
        )
      ),
      el(
        'div',
        { class: 'space-y-3' },
        For({
          each: () => store.tasks.filter((t) => t.status !== 'done').slice(0, 4),
          children: (task) => TaskItem({ task })
        })
      )
    )
  );

  view.appendChild(header);
  view.appendChild(metricsGrid);
  view.appendChild(mainGrid);

  return view;
}
