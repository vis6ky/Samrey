/**
 * @license Apache-2.0
 * @samrey/task-studio - Accessible Modal Dialog Component
 */

import { el, Show } from '@samrey/runtime';
import { Signal, ReadonlySignal } from '@samrey/reactivity';

export interface ModalProps {
  id?: string;
  isOpen: Signal<boolean> | ReadonlySignal<boolean> | (() => boolean);
  title: string;
  onClose: () => void;
  actions?: HTMLElement;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl';
}

export function Modal(props: ModalProps, ...children: any[]): Node {
  const maxWidthClass = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-2xl'
  }[props.maxWidth || 'md'];

  return Show({
    when: () => {
      if (typeof props.isOpen === 'function') {
        return (props.isOpen as () => boolean)();
      }
      return (props.isOpen as Signal<boolean>).value;
    },
    children: () => {
      // Backdrop
      const backdrop = el(
        'div',
        {
          class: 'fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs transition-opacity overflow-y-auto animate-fade-in',
          onClick: (e: MouseEvent) => {
            if (e.target === backdrop) {
              props.onClose();
            }
          }
        },
        // Dialog Card
        el(
          'div',
          {
            id: props.id || 'modal-dialog',
            role: 'dialog',
            'aria-modal': 'true',
            'aria-labelledby': `${props.id || 'modal'}-title`,
            class: `w-full ${maxWidthClass} bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden transform transition-all`
          },
          // Header
          el(
            'div',
            { class: 'px-6 py-4 border-b border-slate-100 flex items-center justify-between' },
            el('h2', { id: `${props.id || 'modal'}-title`, class: 'text-base font-bold text-slate-900 tracking-tight' }, props.title),
            el(
              'button',
              {
                type: 'button',
                class: 'p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition',
                'aria-label': 'Close dialog',
                onClick: props.onClose
              },
              '✕'
            )
          ),
          // Body
          el('div', { class: 'p-6 text-sm text-slate-600 max-h-[70vh] overflow-y-auto' }, ...children),
          // Footer
          props.actions
            ? el('div', { class: 'px-6 py-3.5 bg-slate-50 border-t border-slate-100 flex justify-end items-center gap-3' }, props.actions)
            : null
        )
      );

      return backdrop;
    }
  });
}
