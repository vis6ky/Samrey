/**
 * @license Apache-2.0
 * @samrey/task-studio - Accessible Empty, Loading & Error State Components
 */

import { el } from '@samrey/runtime';
import { Button } from './Button.js';

export interface EmptyStateProps {
  id?: string;
  title: string;
  description: string;
  actionText?: string;
  onAction?: () => void;
}

export function EmptyState(props: EmptyStateProps): HTMLElement {
  const container = el(
    'div',
    {
      id: props.id,
      class: 'flex flex-col items-center justify-center py-16 px-4 text-center bg-white rounded-2xl border border-dashed border-slate-300 shadow-2xs'
    },
    el(
      'div',
      { class: 'w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400 font-mono text-2xl mb-4' },
      '∅'
    ),
    el('h3', { class: 'text-base font-bold text-slate-900 mb-1' }, props.title),
    el('p', { class: 'text-xs text-slate-500 max-w-sm mb-6 leading-relaxed' }, props.description),
    props.actionText && props.onAction
      ? Button(
          {
            variant: 'primary',
            size: 'sm',
            onClick: props.onAction
          },
          props.actionText
        )
      : null
  );

  return container;
}

export interface LoadingStateProps {
  id?: string;
  message?: string;
}

export function LoadingState(props: LoadingStateProps = {}): HTMLElement {
  return el(
    'div',
    {
      id: props.id,
      role: 'status',
      'aria-live': 'polite',
      class: 'flex flex-col items-center justify-center py-16 px-4 text-center'
    },
    el('div', {
      class: 'w-8 h-8 border-3 border-slate-200 border-t-slate-900 rounded-full animate-spin mb-3'
    }),
    el('p', { class: 'text-xs text-slate-500 font-medium' }, props.message || 'Loading task data...')
  );
}

export interface ErrorStateProps {
  id?: string;
  title?: string;
  message: string;
  onRetry?: () => void;
}

export function ErrorState(props: ErrorStateProps): HTMLElement {
  return el(
    'div',
    {
      id: props.id,
      role: 'alert',
      class: 'flex flex-col items-center justify-center py-12 px-6 text-center bg-rose-50/50 rounded-2xl border border-rose-200'
    },
    el(
      'div',
      { class: 'w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center font-bold text-lg mb-3' },
      '!'
    ),
    el('h4', { class: 'text-sm font-bold text-rose-900 mb-1' }, props.title || 'An Error Occurred'),
    el('p', { class: 'text-xs text-rose-700 max-w-md mb-4' }, props.message),
    props.onRetry
      ? Button(
          {
            variant: 'danger',
            size: 'sm',
            onClick: props.onRetry
          },
          'Retry Request'
        )
      : null
  );
}
