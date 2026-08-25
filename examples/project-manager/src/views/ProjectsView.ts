/**
 * @license Apache-2.0
 * Samrey Project Manager — Projects List & Filtering View
 * Native Samrey View with search, category filtering, and sorting
 */

import { el, For, Show } from '@samrey/runtime';
import { store, filteredProjects } from '../state.js';
import { ProjectCard } from '../components/ProjectCard.js';

export function ProjectsView(props: {
  onNavigate: (path: string) => void;
  onOpenNewProject: () => void;
}): HTMLElement {
  const view = el('div', { class: 'space-y-6 max-w-7xl mx-auto' });

  // Header
  const header = el(
    'div',
    { class: 'flex flex-col sm:flex-row sm:items-center justify-between gap-4' },
    el(
      'div',
      null,
      el('h2', { class: 'text-2xl font-bold text-slate-900 tracking-tight' }, 'Projects Directory'),
      el('p', { class: 'text-xs text-slate-500 mt-1' }, 'Manage architecture modules, initiatives, and deliverables.')
    ),
    el(
      'button',
      {
        type: 'button',
        class: 'px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors flex items-center gap-1.5 self-start sm:self-auto',
        onClick: props.onOpenNewProject
      },
      '➕ New Project'
    )
  );

  // Filters Bar
  const filtersBar = el(
    'div',
    { class: 'bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-4' },
    // Category Filter Pills
    el(
      'div',
      { class: 'flex flex-wrap items-center gap-1.5' },
      ...['all', 'core', 'infra', 'security', 'tooling'].map((cat) =>
        el(
          'button',
          {
            type: 'button',
            class: () => {
              const active = store.projectFilter.category === cat;
              const base = 'px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-colors';
              return active
                ? `${base} bg-indigo-600 text-white shadow-xs`
                : `${base} bg-slate-100 text-slate-600 hover:bg-slate-200`;
            },
            onClick: () => {
              store.projectFilter.category = cat;
            }
          },
          cat
        )
      )
    ),
    // Sorting & Status Controls
    el(
      'div',
      { class: 'flex items-center gap-3' },
      el(
        'select',
        {
          class: 'text-xs bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500',
          onChange: (e: Event) => {
            store.projectFilter.sortBy = (e.target as HTMLSelectElement).value as any;
          }
        },
        el('option', { value: 'name' }, 'Sort by Name'),
        el('option', { value: 'createdAt' }, 'Sort by Date'),
        el('option', { value: 'tasks' }, 'Sort by Tasks')
      ),
      el(
        'button',
        {
          type: 'button',
          class: 'text-xs p-1.5 bg-slate-100 hover:bg-slate-200 rounded-lg text-slate-600 font-bold',
          onClick: () => {
            store.projectFilter.sortDirection = store.projectFilter.sortDirection === 'asc' ? 'desc' : 'asc';
          },
          'aria-label': 'Toggle sort direction'
        },
        () => (store.projectFilter.sortDirection === 'asc' ? '▲ ASC' : '▼ DESC')
      )
    )
  );

  // Projects Grid with Empty State Handling
  const gridContainer = el('div', null);

  const grid = el(
    'div',
    { class: 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5' },
    For({
      each: () => filteredProjects.value,
      children: (project) =>
        ProjectCard({
          project,
          onSelect: (id) => props.onNavigate(`/projects?id=${id}`)
        })
    })
  );

  const emptyState = Show({
    when: () => filteredProjects.value.length === 0,
    children: () =>
      el(
        'div',
        { class: 'bg-white rounded-xl border border-slate-200 p-12 text-center' },
        el('div', { class: 'text-3xl mb-2' }, '🔍'),
        el('h4', { class: 'text-base font-bold text-slate-800' }, 'No matching projects found'),
        el('p', { class: 'text-xs text-slate-500 mt-1 max-w-sm mx-auto' }, 'Try clearing filters or search keywords, or create a new project.')
      )
  });

  gridContainer.appendChild(grid);
  gridContainer.appendChild(emptyState);

  view.appendChild(header);
  view.appendChild(filtersBar);
  view.appendChild(gridContainer);

  return view;
}
