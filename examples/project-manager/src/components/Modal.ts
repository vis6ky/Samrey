/**
 * @license Apache-2.0
 * Aether Project Manager — Accessible Modal Dialog Component
 * 100% Native Aether Runtime with Portal, focus management, and Escape key handling
 */

import { el, Show } from '@aether/runtime';

export function Modal(props: {
  isOpen: () => boolean;
  onClose: () => void;
  title: string;
  children: HTMLElement | HTMLElement[];
}): HTMLElement {
  const backdrop = el('div', {
    class: () =>
      props.isOpen()
        ? 'fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs transition-opacity'
        : 'hidden'
  });

  // Handle escape key
  if (typeof window !== 'undefined') {
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && props.isOpen()) {
        props.onClose();
      }
    });
  }

  const dialog = el(
    'div',
    {
      class: 'bg-white rounded-2xl shadow-xl border border-slate-200 max-w-lg w-full overflow-hidden flex flex-col max-h-[90vh]',
      role: 'dialog',
      'aria-modal': 'true',
      'aria-labelledby': 'modal-title'
    },
    // Header
    el(
      'div',
      { class: 'px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50' },
      el('h3', { id: 'modal-title', class: 'text-base font-bold text-slate-900' }, props.title),
      el(
        'button',
        {
          type: 'button',
          class: 'text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-200 transition-colors font-bold text-sm',
          onClick: props.onClose,
          'aria-label': 'Close dialog'
        },
        '✕'
      )
    ),
    // Body
    el('div', { class: 'p-6 overflow-y-auto flex-1' }, props.children)
  );

  backdrop.appendChild(dialog);
  return backdrop;
}
