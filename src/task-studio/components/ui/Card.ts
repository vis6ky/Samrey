/**
 * @license Apache-2.0
 * @samrey/task-studio - Accessible Card Container Component
 */

import { el } from '@samrey/runtime';

export interface CardProps {
  id?: string;
  title?: string | (() => string);
  subtitle?: string | (() => string);
  headerAction?: HTMLElement;
  footer?: HTMLElement;
  class?: string;
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

export function Card(props: CardProps, ...children: any[]): HTMLElement {
  const paddingClass = {
    none: 'p-0',
    sm: 'p-3 sm:p-4',
    md: 'p-5 sm:p-6',
    lg: 'p-6 sm:p-8'
  }[props.padding || 'md'];

  const customClass = props.class ? ` ${props.class}` : '';
  const cardClass = `bg-white rounded-xl border border-slate-200 shadow-xs flex flex-col overflow-hidden${customClass}`;

  const card = el('div', { class: cardClass, id: props.id });

  if (props.title || props.subtitle || props.headerAction) {
    const header = el('div', {
      class: 'px-5 py-4 sm:px-6 border-b border-slate-100 flex items-center justify-between gap-4'
    });

    const titleGroup = el('div', { class: 'min-w-0 flex-1' });

    if (props.title) {
      titleGroup.appendChild(
        el(
          'h3',
          { class: 'text-base font-semibold text-slate-900 leading-6 truncate' },
          typeof props.title === 'function' ? props.title : props.title
        )
      );
    }

    if (props.subtitle) {
      titleGroup.appendChild(
        el(
          'p',
          { class: 'mt-0.5 text-xs text-slate-500 truncate' },
          typeof props.subtitle === 'function' ? props.subtitle : props.subtitle
        )
      );
    }

    header.appendChild(titleGroup);

    if (props.headerAction) {
      header.appendChild(props.headerAction);
    }

    card.appendChild(header);
  }

  const body = el('div', { class: `flex-1 ${paddingClass}` }, ...children);
  card.appendChild(body);

  if (props.footer) {
    const footer = el('div', { class: 'px-5 py-3 sm:px-6 bg-slate-50 border-t border-slate-100' }, props.footer);
    card.appendChild(footer);
  }

  return card;
}
