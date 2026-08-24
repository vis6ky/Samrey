/**
 * @license Apache-2.0
 * Gati Project Manager — Settings & Workspace Configuration View
 * Native Gati View with reactive settings toggles
 */

import { el } from '@gati/runtime';
import { signal } from '@gati/reactivity';
import { notify } from '../state.js';

export function SettingsView(): HTMLElement {
  const autoSave = signal(true);
  const darkMode = signal(false);
  const telemetry = signal(true);

  const view = el('div', { class: 'space-y-6 max-w-4xl mx-auto' });

  // Header
  const header = el(
    'div',
    null,
    el('h2', { class: 'text-2xl font-bold text-slate-900 tracking-tight' }, 'Workspace Settings'),
    el('p', { class: 'text-xs text-slate-500 mt-1' }, 'Preferences and ecosystem options for Gati Project Manager.')
  );

  // Settings Card
  const settingsCard = el(
    'div',
    { class: 'bg-white rounded-xl border border-slate-200 p-6 shadow-xs space-y-6' },
    // Option 1
    el(
      'div',
      { class: 'flex items-center justify-between pb-4 border-b border-slate-100' },
      el(
        'div',
        null,
        el('h4', { class: 'text-sm font-bold text-slate-800' }, 'Optimistic State Sync'),
        el('p', { class: 'text-xs text-slate-500 mt-0.5' }, 'Immediately apply local signal changes before network responses.')
      ),
      el('input', {
        type: 'checkbox',
        checked: true,
        class: 'w-4 h-4 text-indigo-600 rounded cursor-pointer',
        onChange: () => notify('info', 'Settings Updated', 'Optimistic sync state saved.')
      })
    ),
    // Option 2
    el(
      'div',
      { class: 'flex items-center justify-between pb-4 border-b border-slate-100' },
      el(
        'div',
        null,
        el('h4', { class: 'text-sm font-bold text-slate-800' }, 'Zero-Trust CSP Enforcement'),
        el('p', { class: 'text-xs text-slate-500 mt-0.5' }, 'Strict Content Security Policy headers and runtime verification.')
      ),
      el('input', {
        type: 'checkbox',
        checked: true,
        disabled: true,
        class: 'w-4 h-4 text-indigo-600 rounded opacity-60 cursor-not-allowed'
      })
    ),
    // Option 3
    el(
      'div',
      { class: 'flex items-center justify-between' },
      el(
        'div',
        null,
        el('h4', { class: 'text-sm font-bold text-slate-800' }, 'Gati DevTools Bridge Connection'),
        el('p', { class: 'text-xs text-slate-500 mt-0.5' }, 'Enable live reactive graph topology inspections and time-travel debugging.')
      ),
      el('input', {
        type: 'checkbox',
        checked: true,
        class: 'w-4 h-4 text-indigo-600 rounded cursor-pointer',
        onChange: () => notify('info', 'Settings Updated', 'DevTools bridge configuration synced.')
      })
    )
  );

  view.appendChild(header);
  view.appendChild(settingsCard);

  return view;
}
