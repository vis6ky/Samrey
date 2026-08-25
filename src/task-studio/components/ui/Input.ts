/**
 * @license Apache-2.0
 * @samrey/task-studio - Accessible Input Field Component
 */

import { el, Show } from '@samrey/runtime';
import { Signal, ReadonlySignal } from '@samrey/reactivity';

export interface InputProps {
  id: string;
  name?: string;
  label?: string;
  type?: string;
  placeholder?: string;
  value?: Signal<string> | ReadonlySignal<string> | string | (() => string);
  error?: ReadonlySignal<string | null> | string | null | (() => string | null);
  touched?: ReadonlySignal<boolean> | boolean | (() => boolean);
  required?: boolean;
  disabled?: boolean | (() => boolean);
  onInput?: (e: Event) => void;
  onChange?: (e: Event) => void;
  onBlur?: (e: Event) => void;
  class?: string;
  helpText?: string;
}

export function Input(props: InputProps): HTMLElement {
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

  const inputAttrs: Record<string, any> = {
    id: props.id,
    name: props.name || props.id,
    type: props.type || 'text',
    placeholder: props.placeholder || '',
    class: () => {
      const err = typeof props.error === 'function' ? props.error() : (props.error as any)?.value ?? props.error;
      const isErr = Boolean(err);
      const base =
        'w-full px-3.5 py-2 text-sm bg-white border rounded-lg shadow-2xs transition placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-offset-0 disabled:bg-slate-50 disabled:text-slate-500 disabled:cursor-not-allowed';
      if (isErr) {
        return `${base} border-rose-400 text-rose-900 focus:border-rose-500 focus:ring-rose-200`;
      }
      return `${base} border-slate-300 text-slate-900 focus:border-slate-800 focus:ring-slate-200`;
    },
    'aria-invalid': () => {
      const err = typeof props.error === 'function' ? props.error() : (props.error as any)?.value ?? props.error;
      return Boolean(err);
    },
    'aria-describedby': `${props.id}-error ${props.id}-help`,
    'aria-required': props.required ? 'true' : undefined
  };

  if (props.disabled !== undefined) {
    inputAttrs.disabled = props.disabled;
  }

  if (props.value !== undefined) {
    const rawVal = props.value;
    if (typeof rawVal === 'function') {
      inputAttrs.value = rawVal;
    } else if (rawVal !== null && typeof rawVal === 'object' && 'value' in (rawVal as any)) {
      const sig = rawVal as any;
      inputAttrs.value = () => sig.value;
    } else {
      inputAttrs.value = rawVal;
    }
  }

  if (props.onInput) inputAttrs.onInput = props.onInput;
  if (props.onChange) inputAttrs.onChange = props.onChange;
  if (props.onBlur) inputAttrs.onBlur = props.onBlur;

  const inputEl = el('input', inputAttrs);
  container.appendChild(inputEl);

  if (props.helpText) {
    const helpEl = el('p', { id: `${props.id}-help`, class: 'text-xs text-slate-500' }, props.helpText);
    container.appendChild(helpEl);
  }

  // Reactive error display using Show
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
