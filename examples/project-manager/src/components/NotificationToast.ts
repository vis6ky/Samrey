/**
 * @license Apache-2.0
 * Samrey Project Manager — Toast Notifications Overlay Component
 * 100% Native Samrey Runtime Component with <For> and reactive signal animations
 */

import { el, For, Show } from '@samrey/runtime';
import { store, dismissNotification } from '../state.js';
import { NotificationItem } from '../types.js';

export function NotificationToast(): HTMLElement {
  const container = el('div', {
    class: 'fixed bottom-4 right-4 z-50 flex flex-col space-y-2 pointer-events-none max-w-sm w-full px-4'
  });

  const list = For({
    each: () => store.notifications,
    children: (item: NotificationItem) => {
      const typeClasses = {
        success: 'border-emerald-500 bg-white text-slate-800 shadow-lg',
        error: 'border-rose-500 bg-white text-slate-800 shadow-lg',
        warning: 'border-amber-500 bg-white text-slate-800 shadow-lg',
        info: 'border-sky-500 bg-white text-slate-800 shadow-lg'
      }[item.type] || 'border-slate-300 bg-white text-slate-800 shadow-lg';

      const typeBadge = {
        success: 'bg-emerald-100 text-emerald-700',
        error: 'bg-rose-100 text-rose-700',
        warning: 'bg-amber-100 text-amber-700',
        info: 'bg-sky-100 text-sky-700'
      }[item.type] || 'bg-slate-100 text-slate-700';

      return el(
        'div',
        {
          class: `pointer-events-auto p-4 rounded-xl border-l-4 border transition-all duration-300 transform translate-y-0 ${typeClasses}`
        },
        el(
          'div',
          { class: 'flex items-start justify-between gap-3' },
          el(
            'div',
            { class: 'flex-1 min-w-0' },
            el(
              'div',
              { class: 'flex items-center gap-2' },
              el('span', { class: `text-xs px-2 py-0.5 rounded font-mono font-semibold uppercase ${typeBadge}` }, item.type),
              el('h4', { class: 'text-sm font-bold text-slate-900 truncate' }, item.title)
            ),
            el('p', { class: 'text-xs text-slate-600 mt-1 leading-relaxed' }, item.message)
          ),
          el(
            'button',
            {
              type: 'button',
              class: 'text-slate-400 hover:text-slate-700 text-sm font-bold p-1 rounded-md transition-colors',
              onClick: () => dismissNotification(item.id),
              'aria-label': 'Dismiss notification'
            },
            '✕'
          )
        )
      );
    }
  });

  container.appendChild(list);
  return container;
}
