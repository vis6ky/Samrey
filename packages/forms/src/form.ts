/**
 * @license Apache-2.0
 * @aether/forms - Form Container Controller
 */

import { signal, computed, ReadonlySignal } from '@aether/reactivity';
import { createField, FieldState } from './field.js';
import { StandardSchemaV1, Validator } from './standard-schema.js';

export interface FormConfig<TValues extends Record<string, unknown>> {
  initialValues: TValues;
  schema?: StandardSchemaV1<TValues>;
  validators?: { [K in keyof TValues]?: Validator<TValues[K]> };
  onSubmit: (values: TValues) => Promise<void> | void;
}

export interface FormInstance<TValues extends Record<string, unknown>> {
  fields: { [K in keyof TValues]: FieldState<TValues[K]> };
  isValid: ReadonlySignal<boolean>;
  isSubmitting: ReadonlySignal<boolean>;
  submit: (e?: Event) => Promise<boolean>;
}

export function createForm<TValues extends Record<string, unknown>>(
  config: FormConfig<TValues>
): FormInstance<TValues> {
  const isSubmittingSignal = signal<boolean>(false);
  const fields = {} as { [K in keyof TValues]: FieldState<TValues[K]> };

  for (const key of Object.keys(config.initialValues) as (keyof TValues)[]) {
    const val = config.initialValues[key];
    const validator = config.validators?.[key];
    fields[key] = createField(String(key), val, validator);
  }

  const isValid = computed(() => {
    return Object.values<FieldState<unknown>>(fields).every((f) => !f.error.value);
  });

  async function submit(e?: Event): Promise<boolean> {
    if (e && typeof e.preventDefault === 'function') {
      e.preventDefault();
    }

    let allValid = true;
    for (const key of Object.keys(fields) as (keyof TValues)[]) {
      const f = fields[key];
      f.setTouched(true);
      if (!f.validate()) {
        allValid = false;
      }
    }

    if (!allValid) return false;

    isSubmittingSignal.value = true;
    try {
      const values = {} as TValues;
      for (const key of Object.keys(fields) as (keyof TValues)[]) {
        values[key] = fields[key].value.value;
      }
      await config.onSubmit(values);
      return true;
    } finally {
      isSubmittingSignal.value = false;
    }
  }

  return {
    fields,
    isValid,
    isSubmitting: computed(() => isSubmittingSignal.value),
    submit
  };
}
