/**
 * @license Apache-2.0
 * @gati/task-studio - Application Header Component
 */

import { el } from '@gati/runtime';
import { Signal, signal } from '@gati/reactivity';
import { tasksState, setTaskSearch } from '../state/tasks.store.js';
import { settings } from '../state/settings.store.js';
import { Button } from './ui/Button.js';

export interface HeaderProps {
  onNavigate: (path: string) => void;
  onToggleSidebar?: () => void;
}

export function Header(props: HeaderProps): HTMLElement {
  const header = el('header', {
    class: 'sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-2xs select-none'
  });

  const container = el('div', { class: 'max-w-7xl mx-auto px-4 sm:px-6 lg:px-8' });
  const row = el('div', { class: 'flex items-center justify-between h-16 gap-4' });

  // Left Section: Mobile Menu Button + Brand
  const leftSection = el('div', { class: 'flex items-center space-x-3' });

  if (props.onToggleSidebar) {
    const mobileMenuBtn = el(
      'button',
      {
        type: 'button',
        class: 'lg:hidden p-2 rounded-lg text-slate-600 hover:bg-slate-100 transition cursor-pointer',
        'aria-label': 'Toggle navigation sidebar',
        onClick: props.onToggleSidebar
      },
      '☰'
    );
    leftSection.appendChild(mobileMenuBtn);
  }

  const brand = el(
    'div',
    {
      class: 'flex items-center space-x-3 cursor-pointer',
      onClick: () => props.onNavigate('/dashboard')
    },
    el(
      'div',
      { class: 'w-9 h-9 rounded-xl bg-slate-900 text-white flex items-center justify-center font-mono font-bold text-base shadow-xs' },
      'Æ'
    ),
    el(
      'div',
      { class: 'hidden sm:block' },
      el('div', { class: 'flex items-center space-x-2' },
        el('span', { class: 'text-sm font-bold text-slate-900 tracking-tight' }, 'Task Studio'),
        el('span', { class: 'text-[10px] font-mono px-1.5 py-0.2 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 font-medium' }, 'v1.0.0 Stable')
      ),
      el('p', { class: 'text-[11px] text-slate-500' }, 'Production Gati Web Platform')
    )
  );
  leftSection.appendChild(brand);
  row.appendChild(leftSection);

  // Center Section: Live Search Bar
  const centerSection = el('div', { class: 'flex-1 max-w-md hidden md:block' });
  const searchInput = el('input', {
    id: 'header-search-input',
    type: 'search',
    placeholder: 'Search tasks by title, description, or tag... ( / )',
    class:
      'w-full px-3.5 py-1.5 text-xs bg-slate-50 hover:bg-slate-100 focus:bg-white border border-slate-200 rounded-lg transition placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200 focus:border-slate-800',
    value: () => tasksState.searchQuery.value,
    onInput: (e: Event) => {
      setTaskSearch((e.target as HTMLInputElement).value);
    }
  });
  centerSection.appendChild(searchInput);
  row.appendChild(centerSection);

  // Right Section: Latency Pill + New Task Button
  const rightSection = el('div', { class: 'flex items-center space-x-3' });

  const latencyIndicator = el(
    'div',
    { class: 'hidden sm:flex items-center space-x-1.5 px-2.5 py-1 rounded-lg bg-slate-100 text-slate-600 text-xs font-mono border border-slate-200' },
    el('span', { class: 'w-2 h-2 rounded-full bg-emerald-500 animate-pulse' }),
    el('span', null, () => `${settings.value.mockLatencyMs}ms Latency`)
  );
  rightSection.appendChild(latencyIndicator);

  const newTaskBtn = Button(
    {
      id: 'header-new-task-btn',
      variant: 'primary',
      size: 'sm',
      onClick: () => props.onNavigate('/tasks/new')
    },
    '+ New Task'
  );
  rightSection.appendChild(newTaskBtn);

  row.appendChild(rightSection);
  container.appendChild(row);
  header.appendChild(container);

  return header;
}
