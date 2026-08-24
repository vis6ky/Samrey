/**
 * @license Apache-2.0
 * Gati Project Manager — Sidebar Navigation Component
 * 100% Native Gati Runtime with Signal-driven active route tracking
 */

import { el, For, Show } from '@gati/runtime';
import { signal } from '@gati/reactivity';
import { isSidebarCollapsed, store } from '../state.js';

export interface NavItem {
  id: string;
  label: string;
  icon: string;
  path: string;
  badge?: () => number;
}

export function Sidebar(props: {
  currentRoute: { value: string };
  onNavigate: (path: string) => void;
}): HTMLElement {
  const navItems: NavItem[] = [
    { id: 'dashboard', label: 'Dashboard', icon: '📊', path: '/' },
    {
      id: 'projects',
      label: 'Projects',
      icon: '📁',
      path: '/projects',
      badge: () => store.projects.length
    },
    {
      id: 'tasks',
      label: 'Task Board',
      icon: '📋',
      path: '/tasks',
      badge: () => store.tasks.filter((t) => t.status !== 'done').length
    },
    { id: 'security', label: 'Security Center', icon: '🛡️', path: '/security' },
    { id: 'settings', label: 'Settings', icon: '⚙️', path: '/settings' }
  ];

  const sidebar = el('aside', {
    class: () => {
      const base = 'bg-slate-900 text-slate-300 flex flex-col transition-all duration-300 z-20 shrink-0';
      return isSidebarCollapsed.value ? `${base} w-16` : `${base} w-64`;
    }
  });

  // Navigation Links
  const navList = el('nav', { class: 'p-3 flex-1 space-y-1' });

  for (const item of navItems) {
    const isCurrent = () => props.currentRoute.value === item.path;

    const btn = el(
      'button',
      {
        type: 'button',
        class: () => {
          const active = isCurrent();
          const base = 'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors text-left';
          return active
            ? `${base} bg-indigo-600 text-white shadow-xs`
            : `${base} hover:bg-slate-800 text-slate-300 hover:text-white`;
        },
        onClick: () => props.onNavigate(item.path),
        'aria-current': () => (isCurrent() ? 'page' : undefined)
      },
      el('span', { class: 'text-base' }, item.icon),
      Show({
        when: () => !isSidebarCollapsed.value,
        children: () =>
          el(
            'div',
            { class: 'flex-1 flex items-center justify-between' },
            el('span', { class: 'truncate' }, item.label),
            item.badge
              ? Show({
                  when: () => (item.badge ? item.badge() > 0 : false),
                  children: () =>
                    el(
                      'span',
                      {
                        class:
                          'text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700 font-mono'
                      },
                      () => (item.badge ? String(item.badge()) : '')
                    )
                })
              : null
          )
      })
    );

    navList.appendChild(btn);
  }

  // Footer: App version & Zero-framework badge
  const footer = el(
    'div',
    { class: 'p-3 border-t border-slate-800 text-xs text-slate-500' },
    Show({
      when: () => !isSidebarCollapsed.value,
      children: () =>
        el(
          'div',
          { class: 'space-y-1' },
          el('div', { class: 'font-mono text-slate-400' }, 'Gati v1.0.0-rc.1'),
          el('div', { class: 'text-slate-500' }, '100% Pure Gati Primitives')
        ),
      fallback: () => el('div', { class: 'text-center font-mono text-xs text-slate-600' }, 'Æ')
    })
  );

  sidebar.appendChild(navList);
  sidebar.appendChild(footer);
  return sidebar;
}
