/**
 * @license Apache-2.0
 * @samrey/forms - Reactive Field State
 */

import { signal, computed, ReadonlySignal } from '@samrey/reactivity';
import { computeAriaAttributes, AriaBindingAttributes } from './aria.js';
import { Validator } from './standard-schema.js';

export interface FieldState<T> {
  value: ReadonlySignal<T>;
  error: ReadonlySignal<string | null>;
  touched: ReadonlySignal<boolean>;
  dirty: ReadonlySignal<boolean>;
  aria: ReadonlySignal<AriaBindingAttributes>;
  setValue: (val: T) => void;
  setTouched: (touched: boolean) => void;
  setError: (msg: string | null) => void;
  validate: () => boolean;
}

export function createField<T>(
  name: string,
  initialValue: T,
  validator?: Validator<T>
): FieldState<T> {
  const valueSignal = signal<T>(initialValue);
  const errorSignal = signal<string | null>(null);
  const touchedSignal = signal<boolean>(false);
  const initial = initialValue;

  function runValidation(): boolean {
    if (!validator) return true;
    const msg = validator(valueSignal.value);
    errorSignal.value = msg || null;
    return !msg;
  }

  function setValue(val: T): void {
    valueSignal.value = val;
    if (touchedSignal.value) {
      runValidation();
    }
  }

  function setTouched(isTouched: boolean): void {
    touchedSignal.value = isTouched;
    if (isTouched) {
      runValidation();
    }
  }

  function setError(msg: string | null): void {
    errorSignal.value = msg;
  }

  const dirtySignal = computed(() => valueSignal.value !== initial);
  const ariaSignal = computed(() => {
    return computeAriaAttributes(name, !!errorSignal.value && touchedSignal.value);
  });

  return {
    value: computed(() => valueSignal.value),
    error: computed(() => errorSignal.value),
    touched: computed(() => touchedSignal.value),
    dirty: dirtySignal,
    aria: ariaSignal,
    setValue,
    setTouched,
    setError,
    validate: runValidation
  };
}
