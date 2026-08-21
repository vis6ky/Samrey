/**
 * @license Apache-2.0
 * @aether/task-studio - Accessible Toast Notification Container
 */

import { el, For, Show } from '@aether/runtime';
import { toasts, removeToast } from '../../state/toast.store.js';
import { ToastMessage } from '../../types.js';

export function ToastContainer(): HTMLElement {
  const container = el('div', {
    class: 'fixed bottom-4 right-4 z-50 flex flex-col space-y-2 max-w-sm w-full pointer-events-none px-4 sm:px-0',
    role: 'region',
    'aria-label': 'Notifications',
    'aria-live': 'polite'
  });

  const toastList = For({
    each: () => toasts.value,
    key: (toast) => toast.id,
    children: (toast: ToastMessage) => {
      const typeStyles = {
        success: 'bg-white border-emerald-500/40 text-slate-800 shadow-lg',
        error: 'bg-white border-rose-500/40 text-slate-800 shadow-lg',
        warning: 'bg-white border-amber-500/40 text-slate-800 shadow-lg',
        info: 'bg-white border-blue-500/40 text-slate-800 shadow-lg'
      }[toast.type];

      const indicatorColor = {
        success: 'bg-emerald-500',
        error: 'bg-rose-500',
        warning: 'bg-amber-500',
        info: 'bg-blue-500'
      }[toast.type];

      const item = el(
        'div',
        {
          id: toast.id,
          class: `pointer-events-auto flex items-start space-x-3 p-4 rounded-xl border ${typeStyles} transition-all transform animate-slide-up select-none`,
          role: 'status'
        },
        el('div', { class: `w-2 h-2 mt-1.5 rounded-full ${indicatorColor} shrink-0` }),
        el(
          'div',
          { class: 'flex-1 min-w-0' },
          el('h4', { class: 'text-xs font-bold text-slate-900 leading-tight' }, toast.title),
          el('p', { class: 'text-xs text-slate-600 mt-0.5 leading-normal break-words' }, toast.message)
        ),
        el(
          'button',
          {
            type: 'button',
            class: 'text-slate-400 hover:text-slate-700 p-1 rounded-md transition shrink-0',
            'aria-label': 'Dismiss notification',
            onClick: () => removeToast(toast.id)
          },
          '✕'
        )
      );

      return item;
    }
  });

  container.appendChild(toastList);
  return container;
}
