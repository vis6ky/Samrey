/**
 * @license Apache-2.0
 * @samrey/forms - Reactive Field State
 */

import { signal, computed, effect, onCleanup, ReadonlySignal } from '@samrey/reactivity';
import { computeAriaAttributes, AriaBindingAttributes } from './aria.js';
import { Validator } from './standard-schema.js';

export interface FieldState<T> {
  value: ReadonlySignal<T>;
  error: ReadonlySignal<string | null>;
  touched: ReadonlySignal<boolean>;
  dirty: ReadonlySignal<boolean>;
  isValidating: ReadonlySignal<boolean>;
  aria: ReadonlySignal<AriaBindingAttributes>;
  setValue: (val: T) => void;
  setTouched: (touched: boolean) => void;
  setError: (msg: string | null) => void;
  validate: () => boolean | Promise<boolean>;
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

function isPromise(val: unknown): val is Promise<string | null | undefined> {
  return typeof val === 'object' && val !== null && typeof (val as Record<string, unknown>).then === 'function';
}

export function createField<T>(
  name: string,
  initialValue: T,
  validator?: Validator<T>
): FieldState<T> {
  const valueSignal = signal<T>(initialValue);
  const errorSignal = signal<string | null>(null);
  const touchedSignal = signal<boolean>(false);
  const isValidatingSignal = signal<boolean>(false);
  const initial = initialValue;

  function runValidation(): boolean | Promise<boolean> {
    if (!validator) return true;
    const res = validator(valueSignal.value);
    if (isPromise(res)) {
      isValidatingSignal.value = true;
      return res
        .then((msg) => {
          errorSignal.value = msg || null;
          return !msg;
        })
        .catch((err) => {
          errorSignal.value = err?.message || 'Validation error';
          return false;
        })
        .finally(() => {
          isValidatingSignal.value = false;
        });
    }
    errorSignal.value = res || null;
    return !res;
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
    isValidating: computed(() => isValidatingSignal.value),
    aria: ariaSignal,
    setValue,
    setTouched,
    setError,
    validate: runValidation
  };
}

export function bindField<T>(element: any, field: FieldState<T>): void {
  if (!element) return;
  const isCheckbox = element.type === 'checkbox';

  effect(() => {
    const val = field.value.value;
    if (isCheckbox) {
      element.checked = Boolean(val);
    } else {
      const strVal = val != null ? String(val) : '';
      if (element.value !== strVal) {
        element.value = strVal;
      }
    }
  });

  const onInput = (e: any) => {
    const val = isCheckbox ? e.target.checked : e.target.value;
    field.setValue(val as any);
  };
  const onChange = (e: any) => {
    const val = isCheckbox ? e.target.checked : e.target.value;
    field.setValue(val as any);
  };
  const onBlur = () => {
    field.setTouched(true);
    field.validate();
  };

  if (typeof element.addEventListener === 'function') {
    element.addEventListener('input', onInput);
    element.addEventListener('change', onChange);
    element.addEventListener('blur', onBlur);
  }

  onCleanup(() => {
    if (typeof element.removeEventListener === 'function') {
      element.removeEventListener('input', onInput);
      element.removeEventListener('change', onChange);
      element.removeEventListener('blur', onBlur);
    }
  });
}

export const validators = {
  required: (msg = 'Field is required') => (val: unknown) => (!val && val !== 0 ? msg : null),
  email: (msg = 'Invalid email address') => (val: string) => (!val || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(val)) ? null : msg),
  minLength: (min: number, msg = `Minimum length is ${min}`) => (val: string) => (!val || String(val).length >= min ? null : msg),
  maxLength: (max: number, msg = `Maximum length is ${max}`) => (val: string) => (!val || String(val).length <= max ? null : msg)
};
