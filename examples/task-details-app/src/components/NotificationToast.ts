/**
 * @license Apache-2.0
 * Samrey Task Details & Authentication Example — Toast Notification Component
 */

import { el } from '@samrey/runtime';
import { signal, effect } from '@samrey/reactivity';

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info';
  text: string;
}

export const activeToasts = signal<ToastMessage[]>([]);

export function showToast(text: string, type: 'success' | 'error' | 'info' = 'info'): void {
  const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  activeToasts.set([...activeToasts(), { id, type, text }]);

  setTimeout(() => {
    activeToasts.set(activeToasts().filter(t => t.id !== id));
  }, 4000);
}

export function NotificationToast(): HTMLElement {
  const container = el('div', {
    class: 'fixed bottom-5 right-5 z-50 flex flex-col gap-2 pointer-events-none max-w-sm w-full'
  });

  effect(() => {
    container.innerHTML = '';
    const list = activeToasts();

    list.forEach(toast => {
      let bg = 'bg-slate-800 border-slate-700 text-slate-100';
      let badge = 'text-cyan-400';
      if (toast.type === 'success') {
        bg = 'bg-emerald-950/90 border-emerald-800 text-emerald-100';
        badge = 'text-emerald-400';
      } else if (toast.type === 'error') {
        bg = 'bg-rose-950/90 border-rose-800 text-rose-100';
        badge = 'text-rose-400';
      }

      const item = el('div', {
        class: `pointer-events-auto p-4 rounded-xl border shadow-xl backdrop-blur-md flex items-center justify-between gap-3 text-sm animate-fade-in ${bg}`
      });

      const textEl = el('span', { class: 'font-medium' }, toast.text);
      const closeBtn = el('button', {
        class: `text-xs px-1.5 py-0.5 rounded hover:bg-white/10 ${badge}`
      }, '✕');

      closeBtn.addEventListener('click', () => {
        activeToasts.set(activeToasts().filter(t => t.id !== toast.id));
      });

      item.appendChild(textEl);
      item.appendChild(closeBtn);
      container.appendChild(item);
    });
  });

  return container;
}
