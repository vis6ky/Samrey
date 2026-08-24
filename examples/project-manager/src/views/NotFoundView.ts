/**
 * @license Apache-2.0
 * Gati Project Manager — 404 Route Not Found View
 */

import { el } from '@gati/runtime';

export function NotFoundView(props: { onNavigate: (path: string) => void }): HTMLElement {
  return el(
    'div',
    { class: 'max-w-md mx-auto text-center py-16 space-y-4' },
    el('div', { class: 'text-5xl font-mono font-bold text-indigo-600' }, '404'),
    el('h2', { class: 'text-xl font-bold text-slate-900' }, 'Page Not Found'),
    el('p', { class: 'text-xs text-slate-500' }, 'The requested resource does not exist in this Gati Project Manager session.'),
    el(
      'button',
      {
        type: 'button',
        class: 'px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-semibold shadow-xs hover:bg-indigo-700 transition-colors',
        onClick: () => props.onNavigate('/')
      },
      'Return to Dashboard'
    )
  );
}
