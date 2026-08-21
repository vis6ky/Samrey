/**
 * @license Apache-2.0
 * @aether/task-studio - Accessible Select Component
 */

import { el, Show } from '@aether/runtime';
import { Signal, ReadonlySignal } from '@aether/reactivity';

export interface SelectOption {
  value: string;
  label: string;
}

export interface SelectProps {
  id: string;
  name?: string;
  label?: string;
  options: SelectOption[];
  value?: Signal<string> | ReadonlySignal<string> | string | (() => string);
  error?: ReadonlySignal<string | null> | string | null | (() => string | null);
  required?: boolean;
  disabled?: boolean | (() => boolean);
  onChange?: (e: Event) => void;
  class?: string;
}

export function Select(props: SelectProps): HTMLElement {
  const container = el('div', { class: `flex flex-col space-y-1.5 ${props.class || ''}` });

  if (props.label) {
    const labelEl = el(
      'label',
      {
        for: props.id,
        class: 'text-xs font-semibold text-slate-700 select-none flex items-center space-x-1'
      },
      props.label,
      props.required ? el('span', { class: 'text-rose-500', 'aria-hidden': 'true' }, '*') : null
    );
    container.appendChild(labelEl);
  }

  const selectAttrs: Record<string, any> = {
    id: props.id,
    name: props.name || props.id,
    class: () => {
      const err = typeof props.error === 'function' ? props.error() : (props.error as any)?.value ?? props.error;
      const isErr = Boolean(err);
      const base =
        'w-full px-3.5 py-2 text-sm bg-white border rounded-lg shadow-2xs transition focus:outline-none focus:ring-2 focus:ring-offset-0 disabled:bg-slate-50 disabled:text-slate-500 disabled:cursor-not-allowed';
      if (isErr) {
        return `${base} border-rose-400 text-rose-900 focus:border-rose-500 focus:ring-rose-200`;
      }
      return `${base} border-slate-300 text-slate-900 focus:border-slate-800 focus:ring-slate-200`;
    },
    'aria-invalid': () => {
      const err = typeof props.error === 'function' ? props.error() : (props.error as any)?.value ?? props.error;
      return Boolean(err);
    },
    'aria-describedby': `${props.id}-error`,
    'aria-required': props.required ? 'true' : undefined
  };

  if (props.disabled !== undefined) {
    selectAttrs.disabled = props.disabled;
  }

  if (props.value !== undefined) {
    const rawVal = props.value;
    if (typeof rawVal === 'function') {
      selectAttrs.value = rawVal;
    } else if (rawVal !== null && typeof rawVal === 'object' && 'value' in (rawVal as any)) {
      const sig = rawVal as any;
      selectAttrs.value = () => sig.value;
    } else {
      selectAttrs.value = rawVal;
    }
  }

  if (props.onChange) selectAttrs.onChange = props.onChange;

  const selectEl = el(
    'select',
    selectAttrs,
    ...props.options.map((opt) => el('option', { value: opt.value }, opt.label))
  );

  container.appendChild(selectEl);

  if (props.error !== undefined) {
    const errorDisplay = Show({
      when: () => {
        const err = typeof props.error === 'function' ? props.error() : (props.error as any)?.value ?? props.error;
        return Boolean(err);
      },
      children: () => {
        const err = typeof props.error === 'function' ? props.error() : (props.error as any)?.value ?? props.error;
        return el(
          'p',
          {
            id: `${props.id}-error`,
            role: 'alert',
            class: 'text-xs text-rose-600 font-medium flex items-center space-x-1 mt-1'
          },
          String(err)
        );
      }
    });
    container.appendChild(errorDisplay);
  }

  return container;
}
