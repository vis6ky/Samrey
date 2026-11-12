/**
 * @license Apache-2.0
 * @samrey/forms - Reactive Field State
 */

import { signal, computed, effect, onCleanup, ReadonlySignal } from '@samrey/reactivity';
import { computeAriaAttributes, AriaBindingAttributes } from './aria.js';
import { Validator } from './standard-schema.js';
import { REQUIRED_VALIDATOR_MARKER, isRequiredValidator } from './required-marker.js';

export interface FieldState<T> {
  readonly name?: string;
  readonly required?: boolean;
  value: ReadonlySignal<T>;
  error: ReadonlySignal<string | null>;
  touched: ReadonlySignal<boolean>;
  dirty: ReadonlySignal<boolean>;
  isValidating: ReadonlySignal<boolean>;
  aria: ReadonlySignal<AriaBindingAttributes>;
  setValue: (val: T) => void;
  setTouched: (touched: boolean, validateOnTouch?: boolean) => void;
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
  validatorOrConfig?: Validator<T> | { validator?: Validator<T>; required?: boolean },
  options?: { required?: boolean }
): FieldState<T> {
  const isFnOrUndefined = validatorOrConfig === undefined || typeof validatorOrConfig === 'function';
  const validator = isFnOrUndefined ? (validatorOrConfig as Validator<T> | undefined) : validatorOrConfig.validator;
  const required = Boolean(
    (!isFnOrUndefined ? validatorOrConfig.required : undefined) ??
      options?.required ??
      isRequiredValidator(validator)
  );
  const valueSignal = signal<T>(initialValue);
  const errorSignal = signal<string | null>(null);
  const touchedSignal = signal<boolean>(false);
  const isValidatingSignal = signal<boolean>(false);
  const initial = initialValue;
  let validationSeq = 0;

  function runValidation(): boolean | Promise<boolean> {
    const seq = ++validationSeq;
    if (!validator) {
      isValidatingSignal.value = false;
      return true;
    }
    const res = validator(valueSignal.value);
    if (isPromise(res)) {
      isValidatingSignal.value = true;
      return res
        .then((msg) => {
          if (seq !== validationSeq) {
            return !errorSignal.value;
          }
          errorSignal.value = msg || null;
          return !msg;
        })
        .catch((err) => {
          if (seq !== validationSeq) {
            return !errorSignal.value;
          }
          errorSignal.value = err?.message || 'Validation error';
          return false;
        })
        .finally(() => {
          if (seq === validationSeq) {
            isValidatingSignal.value = false;
          }
        });
    }
    errorSignal.value = res || null;
    isValidatingSignal.value = false;
    return !res;
  }

  function setValue(val: T): void {
    valueSignal.value = val;
    if (touchedSignal.value) {
      if (validator) {
        runValidation();
      } else {
        validationSeq++;
        isValidatingSignal.value = false;
        errorSignal.value = null;
      }
    } else {
      // Cancel any prior in-flight validation tied to the previous value
      validationSeq++;
      isValidatingSignal.value = false;
      if (!validator && errorSignal.value) {
        errorSignal.value = null;
      }
    }
  }

  function setTouched(isTouched: boolean, validateOnTouch = true): void {
    touchedSignal.value = isTouched;
    if (isTouched && validateOnTouch) {
      runValidation();
    }
  }

  function setError(msg: string | null): void {
    validationSeq++;
    isValidatingSignal.value = false;
    errorSignal.value = msg;
  }

  const dirtySignal = computed(() => !areValuesEqual(valueSignal.value, initial));
  const ariaSignal = computed(() => {
    return computeAriaAttributes(name, !!errorSignal.value && touchedSignal.value, required);
  });

  return {
    name,
    required,
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

export interface BindFieldOptions {
  errorElement?: any;
  required?: boolean;
}

export function bindField<T>(element: any, field: FieldState<T>, options?: BindFieldOptions): void {
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

  if (typeof element.setAttribute === 'function') {
    effect(() => {
      const ariaAttrs = field.aria.value;
      if (ariaAttrs['aria-invalid']) {
        element.setAttribute('aria-invalid', 'true');
        if (ariaAttrs['aria-errormessage']) {
          element.setAttribute('aria-errormessage', ariaAttrs['aria-errormessage']);
        }
        if (ariaAttrs['aria-describedby']) {
          element.setAttribute('aria-describedby', ariaAttrs['aria-describedby']);
        }
      } else if (typeof element.removeAttribute === 'function') {
        element.removeAttribute('aria-invalid');
        element.removeAttribute('aria-errormessage');
        element.removeAttribute('aria-describedby');
      }
      if (options?.required || ariaAttrs['aria-required']) {
        element.setAttribute('aria-required', 'true');
      }
    });
  }

  if (options?.errorElement) {
    effect(() => {
      const err = field.error.value;
      options.errorElement.textContent = field.touched.value && err ? err : '';
    });
  }

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
  required: (msg = 'Field is required') => {
    const fn = (val: unknown) => (!val && val !== 0 ? msg : null);
    (fn as unknown as Record<symbol, unknown>)[REQUIRED_VALIDATOR_MARKER] = true;
    return fn;
  },
  email: (msg = 'Invalid email address') => (val: string) => (!val || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(val)) ? null : msg),
  minLength: (min: number, msg = `Minimum length is ${min}`) => (val: string) => (!val || String(val).length >= min ? null : msg),
  maxLength: (max: number, msg = `Maximum length is ${max}`) => (val: string) => (!val || String(val).length <= max ? null : msg),
  pattern: (regex: RegExp, msg = 'Invalid format') => (val: string) => {
    if (!val) return null;
    if (regex.global || regex.sticky) {
      regex.lastIndex = 0;
    }
    return regex.test(String(val)) ? null : msg;
  },
  custom: <T = unknown>(
    fn: (val: T) => boolean | string | null | undefined | Promise<string | null | undefined>,
    msg = 'Invalid value'
  ) => (val: T): string | null | undefined | Promise<string | null | undefined> => {
    const res = fn(val);
    if (typeof res === 'boolean') return res ? null : msg;
    if (res && typeof (res as Promise<unknown>).then === 'function') {
      return (res as Promise<unknown>).then((resolved) => {
        if (typeof resolved === 'boolean') return resolved ? null : msg;
        return resolved ?? null;
      }) as Promise<string | null | undefined>;
    }
    return res;
  }
};
