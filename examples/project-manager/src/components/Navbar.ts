/**
 * @license Apache-2.0
 * Gati Project Manager — Navigation Bar Component
 * 100% Native Gati Runtime with Signal-driven Search & Auth State
 */

import { el, Show } from '@gati/runtime';
import { store, isSidebarCollapsed, globalSearchQuery, notify } from '../state.js';
import { SecurityBadge } from './SecurityBadge.js';

export function Navbar(): HTMLElement {
  const nav = el('header', {
    class: 'sticky top-0 z-30 bg-white border-b border-slate-200 px-4 sm:px-6 h-16 flex items-center justify-between shadow-xs'
  });

  // Left Section: Toggle & Title
  const left = el(
    'div',
    { class: 'flex items-center gap-3' },
    el(
      'button',
      {
        type: 'button',
        class: 'p-2 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors',
        onClick: () => {
          isSidebarCollapsed.value = !isSidebarCollapsed.value;
        },
        'aria-label': 'Toggle navigation sidebar'
      },
      el('span', { class: 'text-lg font-bold' }, '☰')
    ),
    el(
      'div',
      { class: 'flex items-center gap-2' },
      el('div', { class: 'w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-bold text-sm shadow-xs' }, 'Æ'),
      el('h1', { class: 'text-base font-bold text-slate-900 hidden sm:block tracking-tight' }, 'Gati Project Manager')
    )
  );

  // Center: Search Bar
  const center = el(
    'div',
    { class: 'flex-1 max-w-md mx-4' },
    el(
      'div',
      { class: 'relative' },
      el('input', {
        type: 'search',
        placeholder: 'Search projects, tasks, tags...',
        value: () => globalSearchQuery.value,
        onInput: (e: Event) => {
          const val = (e.target as HTMLInputElement).value;
          globalSearchQuery.value = val;
          store.projectFilter.search = val;
          store.taskFilter.search = val;
        },
        class: 'w-full pl-9 pr-4 py-1.5 text-sm bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all'
      }),
      el('span', { class: 'absolute left-3 top-2 text-slate-400 text-xs' }, '🔍')
    )
  );

  // Right Section: Security Badge & User Avatar
  const right = el(
    'div',
    { class: 'flex items-center gap-3' },
    SecurityBadge(),
    el(
      'div',
      { class: 'flex items-center gap-2 pl-2 border-l border-slate-200' },
      el('div', { class: 'w-8 h-8 rounded-full bg-indigo-100 border border-indigo-300 text-indigo-800 font-bold flex items-center justify-center text-xs' }, 'AL'),
      el(
        'div',
        { class: 'hidden md:block text-left text-xs' },
        el('div', { class: 'font-bold text-slate-800' }, 'Ada Lovelace'),
        el('div', { class: 'text-slate-500 font-mono' }, 'Admin')
      )
    )
  );

  nav.appendChild(left);
  nav.appendChild(center);
  nav.appendChild(right);

  return nav;
}
