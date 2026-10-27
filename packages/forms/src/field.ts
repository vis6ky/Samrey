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

function areValuesEqual(a: unknown, b: unknown): boolean {
  if (Object.is(a, b)) return true;
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
      if (!areValuesEqual(a[i], b[i])) return false;
    }
    return true;
  }
  if (typeof a === 'object' && a !== null && typeof b === 'object' && b !== null) {
    const keysA = Object.keys(a);
    const keysB = Object.keys(b);
    if (keysA.length !== keysB.length) return false;
    for (const k of keysA) {
      if (!Object.prototype.hasOwnProperty.call(b, k) || !areValuesEqual((a as any)[k], (b as any)[k])) {
        return false;
      }
    }
    return true;
  }
  return false;
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
      if (validator) {
        runValidation();
      } else {
        errorSignal.value = null;
      }
    } else if (!validator && errorSignal.value) {
      errorSignal.value = null;
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

  const dirtySignal = computed(() => !areValuesEqual(valueSignal.value, initial));
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

export function bindField<T>(element: any, field: FieldState<T>): void {
  if (!element) return;
  element.value = field.value.value != null ? String(field.value.value) : '';
  const onInput = (e: any) => {
    field.setValue(e.target.value as any);
  };
  const onBlur = () => {
    field.setTouched(true);
    field.validate();
  };
  if (typeof element.addEventListener === 'function') {
    element.addEventListener('input', onInput);
    element.addEventListener('blur', onBlur);
  }
}

export const validators = {
  required: (msg = 'Field is required') => (val: unknown) => (!val && val !== 0 ? msg : null),
  email: (msg = 'Invalid email address') => (val: string) => (!val || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(val)) ? null : msg),
  minLength: (min: number, msg = `Minimum length is ${min}`) => (val: string) => (!val || String(val).length >= min ? null : msg),
  maxLength: (max: number, msg = `Maximum length is ${max}`) => (val: string) => (!val || String(val).length <= max ? null : msg)
};
