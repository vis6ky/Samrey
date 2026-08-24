/**
 * @license Apache-2.0
 * @gati/task-studio - Dashboard View
 */

import { el, For, Show } from '@gati/runtime';
import { tasksState, toggleTaskStatusAction } from '../state/tasks.store.js';
import { DashboardStats } from '../components/DashboardStats.js';
import { Badge } from '../components/ui/Badge.js';
import { Button } from '../components/ui/Button.js';
import { Card } from '../components/ui/Card.js';
import { TaskActivityLog } from '../types.js';

export interface DashboardViewProps {
  onNavigate: (path: string) => void;
}

export function DashboardView(props: DashboardViewProps): HTMLElement {
  const container = el('div', { class: 'flex flex-col space-y-8 w-full select-none' });

  // 1. Welcome Banner & Fast Actions
  const banner = el(
    'div',
    {
      class: 'bg-gradient-to-r from-slate-900 to-slate-800 rounded-2xl p-6 sm:p-8 text-white shadow-md flex flex-col md:flex-row items-start md:items-center justify-between gap-6'
    },
    el(
      'div',
      { class: 'max-w-xl' },
      el('div', { class: 'flex items-center space-x-2 text-emerald-400 text-xs font-mono mb-1' },
        el('span', { class: 'w-2 h-2 rounded-full bg-emerald-400 animate-pulse' }),
        el('span', null, 'Gati Real-World Production Applet')
      ),
      el('h1', { class: 'text-2xl sm:text-3xl font-extrabold tracking-tight text-white' }, 'Task Studio Dashboard'),
      el(
        'p',
        { class: 'mt-2 text-sm text-slate-300 leading-relaxed' },
        'Manage framework engineering roadmaps, security hardening initiatives, and runtime optimizations using native Gati fine-grained reactivity.'
      )
    ),
    el(
      'div',
      { class: 'flex flex-wrap gap-3' },
      Button(
        {
          variant: 'primary',
          size: 'md',
          class: 'bg-white text-slate-900 hover:bg-slate-100 border-none font-bold',
          onClick: () => props.onNavigate('/tasks/new')
        },
        '+ Create Task'
      ),
      Button(
        {
          variant: 'outline',
          size: 'md',
          class: 'bg-slate-800/80 text-white border-slate-700 hover:bg-slate-700',
          onClick: () => props.onNavigate('/tasks')
        },
        'View All Tasks'
      )
    )
  );

  container.appendChild(banner);

  // 2. Metrics & Analytics
  container.appendChild(DashboardStats());

  // 3. Dual-column Section: Urgent/High Priority Tasks + Recent Activity Timeline
  const bottomGrid = el('div', { class: 'grid grid-cols-1 lg:grid-cols-3 gap-6' });

  // Column A: Urgent & High Priority Focus (2 cols wide on LG)
  const urgentTasksCard = Card(
    {
      title: 'High Priority & Urgent Tasks',
      subtitle: 'Critical path tasks requiring immediate attention',
      padding: 'none',
      class: 'lg:col-span-2'
    },
    // Keyed list of urgent/high priority tasks
    For({
      each: () =>
        tasksState.tasks.value
          .filter((t) => (t.priority === 'urgent' || t.priority === 'high') && t.status !== 'completed')
          .slice(0, 5),
      key: (task) => task.id,
      fallback: () =>
        el('div', { class: 'p-6 text-center text-xs text-slate-500' }, '🎉 No urgent or high-priority tasks pending!'),
      children: (task) => {
        return el(
          'div',
          {
            class: 'p-4 border-b border-slate-100 last:border-b-0 hover:bg-slate-50/80 transition flex items-center justify-between gap-3'
          },
          el(
            'div',
            {
              class: 'min-w-0 flex-1 cursor-pointer',
              onClick: () => props.onNavigate(`/tasks/${task.id}`)
            },
            el(
              'div',
              { class: 'flex items-center space-x-2' },
              el('h4', { class: 'text-xs font-bold text-slate-900 truncate hover:text-blue-600 transition' }, task.title),
              Badge({ variant: 'priority', value: task.priority })
            ),
            el('p', { class: 'mt-0.5 text-[11px] text-slate-500 truncate' }, task.description)
          ),
          el(
            'div',
            { class: 'flex items-center space-x-2 shrink-0' },
            el('span', { class: 'text-[11px] font-mono text-slate-400 hidden sm:inline' }, `Due: ${task.dueDate}`),
            Button(
              {
                variant: 'outline',
                size: 'sm',
                onClick: (e: MouseEvent) => {
                  e.stopPropagation();
                  toggleTaskStatusAction(task);
                }
              },
              'Complete'
            )
          )
        );
      }
    })
  );

  // Column B: Recent Activity Timeline (1 col wide)
  const activityTimelineCard = Card(
    {
      title: 'Recent Activity Feed',
      subtitle: 'Real-time state mutation history',
      padding: 'none',
      class: 'lg:col-span-1'
    },
    el(
      'div',
      { class: 'divide-y divide-slate-100 max-h-[380px] overflow-y-auto' },
      For({
        each: () => tasksState.activities.value.slice(0, 8),
        key: (act) => act.id,
        fallback: () => el('div', { class: 'p-6 text-center text-xs text-slate-400' }, 'No recorded activities.'),
        children: (act: TaskActivityLog) => {
          const actionBadgeColor = {
            created: 'bg-emerald-100 text-emerald-800',
            updated: 'bg-blue-100 text-blue-800',
            completed: 'bg-indigo-100 text-indigo-800',
            deleted: 'bg-rose-100 text-rose-800',
            reopened: 'bg-amber-100 text-amber-800'
          }[act.action];

          const dateStr = new Date(act.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

          return el(
            'div',
            { class: 'p-3.5 flex items-start space-x-2.5 text-xs' },
            el('span', { class: `text-[10px] uppercase font-bold px-1.5 py-0.5 rounded ${actionBadgeColor} shrink-0 mt-0.5` }, act.action),
            el(
              'div',
              { class: 'min-w-0 flex-1' },
              el('p', { class: 'text-slate-800 font-medium truncate' }, act.taskTitle),
              el('span', { class: 'text-[10px] text-slate-400 font-mono' }, dateStr)
            )
          );
        }
      })
    )
  );

  bottomGrid.appendChild(urgentTasksCard);
  bottomGrid.appendChild(activityTimelineCard);
  container.appendChild(bottomGrid);

  return container;
}
