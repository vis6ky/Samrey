/**
 * @license Apache-2.0
 * @gati/task-studio - Reactive Dashboard Statistics & Metrics Component
 */

import { el, For } from '@gati/runtime';
import { tasksState } from '../state/tasks.store.js';

export function DashboardStats(): HTMLElement {
  const container = el('div', { class: 'flex flex-col space-y-6 w-full' });

  // 1. Metric Cards Grid (Total, Completed, Pending, Overdue)
  const metricCards = el('div', { class: 'grid grid-cols-2 lg:grid-cols-4 gap-4' });

  // Helper to create a reactive stat card
  function createStatCard(title: string, valueFn: () => number | string, color: string, badgeText?: () => string) {
    return el(
      'div',
      { class: 'bg-white rounded-xl border border-slate-200 p-4 sm:p-5 shadow-2xs flex flex-col justify-between select-none' },
      el(
        'div',
        { class: 'flex items-center justify-between' },
        el('span', { class: 'text-xs font-semibold text-slate-500 uppercase tracking-wider' }, title),
        badgeText
          ? el(
              'span',
              { class: `text-[10px] font-bold px-1.5 py-0.5 rounded-full ${color}` },
              badgeText
            )
          : null
      ),
      el('div', { class: 'mt-3 flex items-baseline space-x-2' },
        el('span', { class: 'text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight font-mono' }, () =>
          String(valueFn())
        )
      )
    );
  }

  metricCards.appendChild(
    createStatCard('Total Tasks', () => tasksState.stats.value.totalTasks, 'bg-slate-100 text-slate-700')
  );
  metricCards.appendChild(
    createStatCard(
      'Completed',
      () => tasksState.stats.value.completedTasks,
      'bg-emerald-100 text-emerald-800',
      () => `${tasksState.stats.value.completionPercentage}%`
    )
  );
  metricCards.appendChild(
    createStatCard('Pending', () => tasksState.stats.value.pendingTasks, 'bg-blue-100 text-blue-800')
  );
  metricCards.appendChild(
    createStatCard(
      'Overdue',
      () => tasksState.stats.value.overdueTasks,
      'bg-rose-100 text-rose-800',
      () => (tasksState.stats.value.overdueTasks > 0 ? 'Action Needed' : 'All Clear')
    )
  );

  container.appendChild(metricCards);

  // 2. Progress Bar Card
  const progressCard = el(
    'div',
    { class: 'bg-white rounded-xl border border-slate-200 p-5 shadow-2xs' },
    el(
      'div',
      { class: 'flex items-center justify-between mb-2 text-xs' },
      el('span', { class: 'font-semibold text-slate-700' }, 'Overall Project Completion'),
      el(
        'span',
        { class: 'font-mono font-bold text-slate-900' },
        () => `${tasksState.stats.value.completedTasks} / ${tasksState.stats.value.totalTasks} Tasks (${tasksState.stats.value.completionPercentage}%)`
      )
    ),
    // Progress Bar Track
    el(
      'div',
      { class: 'w-full h-2.5 bg-slate-100 rounded-full overflow-hidden' },
      el('div', {
        class: 'h-full bg-emerald-500 rounded-full transition-all duration-300',
        style: () => `width: ${tasksState.stats.value.completionPercentage}%`
      })
    )
  );

  container.appendChild(progressCard);

  // 3. Category & Priority Distribution Grid
  const distributionGrid = el('div', { class: 'grid grid-cols-1 md:grid-cols-2 gap-4' });

  // Priority Breakdown Card
  const priorityCard = el(
    'div',
    { class: 'bg-white rounded-xl border border-slate-200 p-5 shadow-2xs flex flex-col justify-between' },
    el('h4', { class: 'text-xs font-bold text-slate-900 uppercase tracking-wider mb-3' }, 'Priority Distribution'),
    el(
      'div',
      { class: 'flex flex-col space-y-2 text-xs' },
      el(
        'div',
        { class: 'flex items-center justify-between' },
        el('span', { class: 'flex items-center space-x-1.5' },
          el('span', { class: 'w-2 h-2 rounded-full bg-rose-500' }),
          el('span', null, 'Urgent')
        ),
        el('span', { class: 'font-mono font-bold text-slate-900' }, () => String(tasksState.stats.value.priorityBreakdown.urgent))
      ),
      el(
        'div',
        { class: 'flex items-center justify-between' },
        el('span', { class: 'flex items-center space-x-1.5' },
          el('span', { class: 'w-2 h-2 rounded-full bg-amber-500' }),
          el('span', null, 'High')
        ),
        el('span', { class: 'font-mono font-bold text-slate-900' }, () => String(tasksState.stats.value.priorityBreakdown.high))
      ),
      el(
        'div',
        { class: 'flex items-center justify-between' },
        el('span', { class: 'flex items-center space-x-1.5' },
          el('span', { class: 'w-2 h-2 rounded-full bg-blue-500' }),
          el('span', null, 'Medium')
        ),
        el('span', { class: 'font-mono font-bold text-slate-900' }, () => String(tasksState.stats.value.priorityBreakdown.medium))
      ),
      el(
        'div',
        { class: 'flex items-center justify-between' },
        el('span', { class: 'flex items-center space-x-1.5' },
          el('span', { class: 'w-2 h-2 rounded-full bg-slate-400' }),
          el('span', null, 'Low')
        ),
        el('span', { class: 'font-mono font-bold text-slate-900' }, () => String(tasksState.stats.value.priorityBreakdown.low))
      )
    )
  );

  // Category Breakdown Card
  const categoryCard = el(
    'div',
    { class: 'bg-white rounded-xl border border-slate-200 p-5 shadow-2xs flex flex-col justify-between' },
    el('h4', { class: 'text-xs font-bold text-slate-900 uppercase tracking-wider mb-3' }, 'Category Breakdown'),
    el(
      'div',
      { class: 'flex flex-col space-y-2 text-xs' },
      el(
        'div',
        { class: 'flex items-center justify-between' },
        el('span', { class: 'text-slate-600' }, 'Engineering'),
        el('span', { class: 'font-mono font-bold text-slate-900' }, () => String(tasksState.stats.value.categoryBreakdown.engineering))
      ),
      el(
        'div',
        { class: 'flex items-center justify-between' },
        el('span', { class: 'text-slate-600' }, 'Architecture'),
        el('span', { class: 'font-mono font-bold text-slate-900' }, () => String(tasksState.stats.value.categoryBreakdown.architecture))
      ),
      el(
        'div',
        { class: 'flex items-center justify-between' },
        el('span', { class: 'text-slate-600' }, 'Security'),
        el('span', { class: 'font-mono font-bold text-slate-900' }, () => String(tasksState.stats.value.categoryBreakdown.security))
      ),
      el(
        'div',
        { class: 'flex items-center justify-between' },
        el('span', { class: 'text-slate-600' }, 'Design'),
        el('span', { class: 'font-mono font-bold text-slate-900' }, () => String(tasksState.stats.value.categoryBreakdown.design))
      ),
      el(
        'div',
        { class: 'flex items-center justify-between' },
        el('span', { class: 'text-slate-600' }, 'Documentation'),
        el('span', { class: 'font-mono font-bold text-slate-900' }, () => String(tasksState.stats.value.categoryBreakdown.documentation))
      )
    )
  );

  distributionGrid.appendChild(priorityCard);
  distributionGrid.appendChild(categoryCard);
  container.appendChild(distributionGrid);

  return container;
}
