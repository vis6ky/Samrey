/**
 * @license Apache-2.0
 * @gati/task-studio - Application Navigation Sidebar Component
 */

import { el, For } from '@gati/runtime';
import { RouterInstance } from '@gati/router';
import { tasksState, setTaskFilter, setTaskCategory, setTaskPriority } from '../state/tasks.store.js';
import { TaskFilterType } from '../types.js';

export interface SidebarProps {
  router: RouterInstance;
  onNavigate: (path: string) => void;
  isMobileOpen?: () => boolean;
  onCloseMobile?: () => void;
}

interface NavItem {
  path: string;
  label: string;
  icon: string;
  countFn?: () => number | string;
}

export function Sidebar(props: SidebarProps): HTMLElement {
  const navItems: NavItem[] = [
    { path: '/dashboard', label: 'Dashboard', icon: '📊' },
    { path: '/tasks', label: 'All Tasks', icon: '📋', countFn: () => tasksState.stats.value.totalTasks },
    { path: '/tasks/new', label: 'New Task', icon: '➕' },
    { path: '/security', label: 'Security Defenses', icon: '🛡️' },
    { path: '/benchmarks', label: 'DOM Benchmarks', icon: '⚡' },
    { path: '/settings', label: 'Settings', icon: '⚙️' },
    { path: '/about', label: 'About Gati', icon: 'ℹ️' }
  ];

  const quickFilters: Array<{ type: TaskFilterType; label: string; countFn: () => number }> = [
    { type: 'all', label: 'All Items', countFn: () => tasksState.stats.value.totalTasks },
    { type: 'active', label: 'Active', countFn: () => tasksState.stats.value.pendingTasks },
    { type: 'completed', label: 'Completed', countFn: () => tasksState.stats.value.completedTasks },
    { type: 'high-priority', label: 'High / Urgent', countFn: () => tasksState.stats.value.highCount + tasksState.stats.value.urgentCount },
    { type: 'overdue', label: 'Overdue', countFn: () => tasksState.stats.value.overdueTasks }
  ];

  const sidebar = el('aside', {
    id: 'app-sidebar',
    class: 'w-64 bg-white border-r border-slate-200 flex flex-col justify-between p-4 shrink-0 select-none overflow-y-auto'
  });

  const topSection = el('div', { class: 'flex flex-col space-y-6' });

  // 1. Primary Navigation Menu
  const navMenu = el('nav', { class: 'flex flex-col space-y-1', 'aria-label': 'Main navigation' });

  for (const item of navItems) {
    const isActive = () => props.router.currentPath.value === item.path;
    const btn = el(
      'button',
      {
        type: 'button',
        class: () => {
          const active = isActive();
          const base =
            'w-full flex items-center justify-between px-3 py-2 text-xs font-semibold rounded-lg transition text-left cursor-pointer';
          if (active) {
            return `${base} bg-slate-900 text-white shadow-xs`;
          }
          return `${base} text-slate-700 hover:bg-slate-100 hover:text-slate-900`;
        },
        onClick: () => {
          props.onNavigate(item.path);
          if (props.onCloseMobile) props.onCloseMobile();
        }
      },
      el('span', { class: 'flex items-center space-x-2.5' },
        el('span', { class: 'text-sm' }, item.icon),
        el('span', null, item.label)
      ),
      item.countFn
        ? el(
            'span',
            {
              class: () =>
                `text-[11px] font-mono px-1.5 py-0.2 rounded-full ${
                  isActive() ? 'bg-slate-800 text-slate-200' : 'bg-slate-100 text-slate-600'
                }`
            },
            () => String(item.countFn!())
          )
        : null
    );

    navMenu.appendChild(btn);
  }

  topSection.appendChild(navMenu);

  // 2. Filter Status Section
  const filterSection = el('div', { class: 'flex flex-col space-y-1 pt-4 border-t border-slate-100' });
  filterSection.appendChild(
    el('h4', { class: 'px-3 text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1' }, 'Status Views')
  );

  for (const filter of quickFilters) {
    const isSelected = () => tasksState.filterType.value === filter.type;
    const btn = el(
      'button',
      {
        type: 'button',
        class: () => {
          const selected = isSelected();
          const base =
            'w-full flex items-center justify-between px-3 py-1.5 text-xs font-medium rounded-lg transition text-left cursor-pointer';
          if (selected) {
            return `${base} bg-slate-100 text-slate-900 font-semibold`;
          }
          return `${base} text-slate-600 hover:bg-slate-50 hover:text-slate-900`;
        },
        onClick: () => {
          setTaskFilter(filter.type);
          props.onNavigate('/tasks');
          if (props.onCloseMobile) props.onCloseMobile();
        }
      },
      el('span', null, filter.label),
      el(
        'span',
        {
          class: () =>
            `text-[10px] font-mono px-1.5 py-0.2 rounded-full ${
              isSelected() ? 'bg-slate-200 text-slate-800 font-bold' : 'bg-slate-100 text-slate-500'
            }`
        },
        () => String(filter.countFn())
      )
    );
    filterSection.appendChild(btn);
  }
  topSection.appendChild(filterSection);

  sidebar.appendChild(topSection);

  // Bottom Footer Section: Gati Monorepo Zero-Eval Certification
  const footerSection = el(
    'div',
    { class: 'pt-4 border-t border-slate-100 text-xs text-slate-500 flex flex-col space-y-2' },
    el(
      'div',
      { class: 'flex items-center space-x-2' },
      el('span', { class: 'w-2 h-2 rounded-full bg-emerald-500' }),
      el('span', { class: 'font-mono text-[11px] font-semibold text-slate-800' }, '100% Native Gati')
    ),
    el('p', { class: 'text-[10px] text-slate-400 leading-tight' }, 'Zero React · Zero VDOM · Fine-Grained Reactive Primitives')
  );
  sidebar.appendChild(footerSection);

  return sidebar;
}
