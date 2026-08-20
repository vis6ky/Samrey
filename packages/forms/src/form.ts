/**
 * @license Apache-2.0
 * @aether/forms - Form Container Controller with Standard Schema (~v1) Support
 */

import { signal, computed, ReadonlySignal } from '@aether/reactivity';
import { createField, FieldState } from './field.js';
import { StandardSchemaV1, Validator } from './standard-schema.js';

export interface FormConfig<TValues extends Record<string, any>> {
  initialValues: TValues;
  schema?: StandardSchemaV1<TValues>;
  validators?: { [K in keyof TValues]?: Validator<TValues[K]> };
  onSubmit: (values: TValues) => Promise<void> | void;
}

export interface FormInstance<TValues extends Record<string, any>> {
  fields: { [K in keyof TValues]: FieldState<TValues[K]> };
  formError: ReadonlySignal<string | null>;
  isValid: ReadonlySignal<boolean>;
  isSubmitting: ReadonlySignal<boolean>;
  submit: (e?: Event) => Promise<boolean>;
  reset: () => void;
}

export function createForm<TValues extends Record<string, any>>(
  config: FormConfig<TValues>
): FormInstance<TValues> {
  const isSubmittingSignal = signal<boolean>(false);
  const formErrorSignal = signal<string | null>(null);
  const fields = Object.create(null) as { [K in keyof TValues]: FieldState<TValues[K]> };

  for (const key of Object.keys(config.initialValues) as (keyof TValues)[]) {
    if (key === '__proto__' || key === 'constructor' || key === 'prototype') continue;
    const val = config.initialValues[key];
    const validator = config.validators?.[key];
    fields[key] = createField(String(key), val, validator);
  }

  const isValid = computed(() => {
    const fieldsValid = Object.values<FieldState<unknown>>(fields).every((f) => !f.error.value);
    return fieldsValid && !formErrorSignal.value;
  });

  function reset(): void {
    formErrorSignal.value = null;
    for (const key of Object.keys(config.initialValues) as (keyof TValues)[]) {
      fields[key].setValue(config.initialValues[key]);
      fields[key].setTouched(false);
      fields[key].setError(null);
    }
  }

  async function submit(e?: Event): Promise<boolean> {
    if (e && typeof e.preventDefault === 'function') {
      e.preventDefault();
    }

    formErrorSignal.value = null;
    let allValid = true;

    // 1. Mark fields as touched and run synchronous field-level validators
    for (const key of Object.keys(fields) as (keyof TValues)[]) {
      const f = fields[key];
      f.setTouched(true);
      if (!f.validate()) {
        allValid = false;
      }
    }

    // 2. Collect current form values
    const values = {} as TValues;
    for (const key of Object.keys(fields) as (keyof TValues)[]) {
      values[key] = fields[key].value.value;
    }

    // 3. Execute Standard Schema (~v1) validation if provided
    let finalValues = values;
    if (config.schema && config.schema['~standard']) {
      try {
        const schemaResult = config.schema['~standard'].validate(values);
        const result = schemaResult instanceof Promise ? await schemaResult : schemaResult;

        if (result.issues && result.issues.length > 0) {
          allValid = false;
          for (const issue of result.issues) {
            const fieldKey = issue.path && issue.path.length > 0 ? String(issue.path[0]) : null;
            if (fieldKey && fieldKey in fields) {
              fields[fieldKey as keyof TValues].setError(issue.message);
            } else {
              formErrorSignal.value = issue.message;
            }
          }
        } else if ('value' in result && result.value !== undefined) {
          finalValues = result.value as TValues;
        }
      } catch (err: any) {
        allValid = false;
        formErrorSignal.value = err?.message || 'Validation error';
      }
    }

    if (!allValid) {
      return false;
    }

    // 4. Run onSubmit
    isSubmittingSignal.value = true;
    try {
      await config.onSubmit(finalValues);
      return true;
    } finally {
      isSubmittingSignal.value = false;
    }
  }

  return {
    fields,
    formError: computed(() => formErrorSignal.value),
    isValid,
    isSubmitting: computed(() => isSubmittingSignal.value),
    submit,
    reset
  };
}
