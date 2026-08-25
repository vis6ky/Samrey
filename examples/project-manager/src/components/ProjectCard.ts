/**
 * @license Apache-2.0
 * Samrey Project Manager — Project Card Component
 * Native Samrey Reactive Component with dynamic progress bar and actions
 */

import { el } from '@samrey/runtime';
import { Project } from '../types.js';
import { removeProject } from '../state.js';

export function ProjectCard(props: {
  project: Project;
  onSelect: (id: string) => void;
}): HTMLElement {
  const { project, onSelect } = props;

  const categoryColors = {
    core: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    infra: 'bg-sky-50 text-sky-700 border-sky-200',
    security: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    frontend: 'bg-purple-50 text-purple-700 border-purple-200',
    tooling: 'bg-amber-50 text-amber-700 border-amber-200'
  }[project.category] || 'bg-slate-50 text-slate-700 border-slate-200';

  const total = project.taskCount || 0;
  const completed = project.completedTaskCount || 0;
  const percent = total > 0 ? Math.round((completed / total) * 100) : 0;

  const card = el(
    'div',
    {
      class:
        'bg-white border border-slate-200 rounded-xl p-5 shadow-xs hover:shadow-md transition-shadow flex flex-col justify-between group cursor-pointer',
      onClick: (e: Event) => {
        const target = e.target as HTMLElement;
        if (!target.closest('button')) {
          onSelect(project.id);
        }
      }
    },
    // Card Header
    el(
      'div',
      { class: 'flex items-start justify-between gap-3' },
      el(
        'div',
        { class: 'flex-1' },
        el(
          'div',
          { class: 'flex items-center gap-2 mb-1.5' },
          el('span', { class: `text-xs px-2.5 py-0.5 rounded-md font-mono uppercase font-semibold border ${categoryColors}` }, project.category),
          el('span', { class: 'text-xs text-slate-400 font-mono' }, project.lead)
        ),
        el('h3', { class: 'text-base font-bold text-slate-900 group-hover:text-indigo-600 transition-colors' }, project.name)
      ),
      el(
        'button',
        {
          type: 'button',
          class: 'text-slate-400 hover:text-rose-600 p-1.5 rounded-lg hover:bg-rose-50 transition-colors text-xs font-bold',
          onClick: (e: Event) => {
            e.stopPropagation();
            if (confirm(`Are you sure you want to delete project "${project.name}"?`)) {
              removeProject(project.id);
            }
          },
          'aria-label': `Delete project ${project.name}`
        },
        '🗑️'
      )
    ),
    // Description
    el('p', { class: 'text-xs text-slate-600 mt-2 line-clamp-2 leading-relaxed' }, project.description),
    // Progress Bar
    el(
      'div',
      { class: 'mt-4 pt-3 border-t border-slate-100' },
      el(
        'div',
        { class: 'flex items-center justify-between text-xs text-slate-500 mb-1.5 font-mono' },
        el('span', null, `${completed}/${total} Tasks Done`),
        el('span', { class: 'font-bold text-slate-800' }, `${percent}%`)
      ),
      el(
        'div',
        { class: 'w-full h-2 bg-slate-100 rounded-full overflow-hidden' },
        el('div', {
          class: `h-full rounded-full transition-all duration-500 ${percent === 100 ? 'bg-emerald-500' : 'bg-indigo-600'}`,
          style: `width: ${percent}%;`
        })
      )
    )
  );

  return card;
}
