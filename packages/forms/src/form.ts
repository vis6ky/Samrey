/**
 * @license Apache-2.0
 * @samrey/forms - Form Container Controller with Standard Schema (~v1) Support
 */

import { signal, computed, ReadonlySignal } from '@samrey/reactivity';
import { createField, FieldState } from './field.js';
import { isRequiredValidator } from './required-marker.js';
import { StandardSchemaV1, Validator } from './standard-schema.js';

export type FormValidateFn<TValues extends Record<string, any>> = (
  values: TValues
) =>
  | Partial<Record<keyof TValues, string | null | undefined>>
  | Record<string, string | null | undefined>
  | void
  | Promise<
      | Partial<Record<keyof TValues, string | null | undefined>>
      | Record<string, string | null | undefined>
      | void
    >;

export interface FormConfig<TValues extends Record<string, any>> {
  initialValues: TValues;
  schema?: StandardSchemaV1<TValues>;
  validators?: { [K in keyof TValues]?: Validator<TValues[K]> | readonly Validator<TValues[K]>[] };
  required?: { [K in keyof TValues]?: boolean };
  validate?: FormValidateFn<TValues>;
  onSubmit: (values: TValues) => Promise<void> | void;
}

function composeValidators<T>(
  spec?: Validator<T> | readonly Validator<T>[]
): Validator<T> | undefined {
  if (!spec) return undefined;
  if (typeof spec === 'function') return spec;
  const list = spec.filter((v): v is Validator<T> => typeof v === 'function');
  if (list.length === 0) return undefined;
  if (list.length === 1) return list[0];
  return (value: T) => {
    for (let i = 0; i < list.length; i++) {
      const res = list[i](value);
      if (res && typeof (res as Promise<unknown>).then === 'function') {
        return (async () => {
          const awaited = await res;
          if (awaited) return awaited;
          for (let j = i + 1; j < list.length; j++) {
            const next = await list[j](value);
            if (next) return next;
          }
          return null;
        })();
      }
      if (res) return res;
    }
    return null;
  };
}

export interface FormInstance<TValues extends Record<string, any>> {
  fields: { [K in keyof TValues]: FieldState<TValues[K]> };
  formError: ReadonlySignal<string | null>;
  isValid: ReadonlySignal<boolean>;
  isSubmitting: ReadonlySignal<boolean>;
  submit: (e?: Event) => Promise<boolean>;
  handleSubmit: (e?: Event) => Promise<boolean>;
  reset: () => void;
}

export function createForm<TValues extends Record<string, any>>(
  config: FormConfig<TValues>
): FormInstance<TValues> {
  const isSubmittingSignal = signal<boolean>(false);
  const formErrorSignal = signal<string | null>(null);
  let submitInFlight = false;
  let resetEpoch = 0;
  const fields = Object.create(null) as { [K in keyof TValues]: FieldState<TValues[K]> };

  for (const key of Object.keys(config.initialValues) as (keyof TValues)[]) {
    if (key === '__proto__' || key === 'constructor' || key === 'prototype') continue;
    const val = config.initialValues[key];
    const validatorSpec = config.validators?.[key];
    const validator = composeValidators(validatorSpec);
    const isReq = Boolean(config.required?.[key] ?? isRequiredValidator(validatorSpec));
    fields[key] = createField(String(key), val, validator, { required: isReq });
  }

  const isValid = computed(() => {
    const fieldsValid = (Object.values(fields) as FieldState<unknown>[]).every((f) => !f.error.value);
    return fieldsValid && !formErrorSignal.value;
  });

  function reset(): void {
    resetEpoch++;
    submitInFlight = false;
    isSubmittingSignal.value = false;
    formErrorSignal.value = null;
    for (const key of Object.keys(fields) as (keyof TValues)[]) {
      const field = fields[key];
      if (!field) continue;
      // Clear touched BEFORE restoring initialValue so validation does not re-fire during reset
      field.setTouched(false, false);
      field.setValue(config.initialValues[key]);
      field.setError(null);
    }
  }

  async function submit(e?: Event): Promise<boolean> {
    if (e && typeof e.preventDefault === 'function') {
      e.preventDefault();
    }

    if (submitInFlight || isSubmittingSignal.value) {
      return false;
    }

    submitInFlight = true;
    isSubmittingSignal.value = true;
    formErrorSignal.value = null;
    const epoch = resetEpoch;

    try {
      let allValid = true;

      // 1. Mark fields as touched and run field-level validators
      for (const key of Object.keys(fields) as (keyof TValues)[]) {
        if (epoch !== resetEpoch) return false;
        const f = fields[key];
        f.setTouched(true, false);
        f.setError(null);
        const res = f.validate();
        if (res instanceof Promise) {
          const ok = await res;
          if (epoch !== resetEpoch) return false;
          if (!ok) allValid = false;
        } else {
          if (epoch !== resetEpoch) return false;
          if (!res) allValid = false;
        }
      }

      if (epoch !== resetEpoch) return false;

      // 2. Collect current form values
      const values = {} as TValues;
      for (const key of Object.keys(fields) as (keyof TValues)[]) {
        values[key] = fields[key].value.value;
      }

      // 2b. Execute form-level validate() callback if provided
      if (typeof config.validate === 'function') {
        try {
          const validateRes = config.validate(values);
          const errorsObj =
            validateRes && typeof (validateRes as Promise<unknown>).then === 'function'
              ? await validateRes
              : validateRes;
          if (epoch !== resetEpoch) return false;
          if (errorsObj && typeof errorsObj === 'object') {
            for (const errKey of Object.keys(errorsObj)) {
              if (errKey === '__proto__' || errKey === 'constructor' || errKey === 'prototype') continue;
              const msg = (errorsObj as Record<string, string | null | undefined>)[errKey];
              if (msg) {
                allValid = false;
                if (Object.prototype.hasOwnProperty.call(fields, errKey)) {
                  fields[errKey as keyof TValues].setError(String(msg));
                } else {
                  formErrorSignal.value = String(msg);
                }
              }
            }
          }
        } catch (err: any) {
          if (epoch !== resetEpoch) return false;
          allValid = false;
          formErrorSignal.value = err?.message || 'Validation error';
        }
      }

      if (epoch !== resetEpoch) return false;

      // 3. Execute Standard Schema (~v1) validation if provided
      let finalValues = values;
      if (config.schema && config.schema['~standard']) {
        try {
          const schemaResult = config.schema['~standard'].validate(values);
          const result = schemaResult instanceof Promise ? await schemaResult : schemaResult;
          if (epoch !== resetEpoch) return false;

          if (result.issues && result.issues.length > 0) {
            allValid = false;
            for (const issue of result.issues) {
              let fieldKey: string | null = null;
              if (issue.path && issue.path.length > 0) {
                const seg: any = issue.path[0];
                if (seg != null) {
                  if (typeof seg === 'object' && 'key' in seg) {
                    fieldKey = String(seg.key);
                  } else {
                    fieldKey = String(seg);
                  }
                }
              }
              if (fieldKey && Object.prototype.hasOwnProperty.call(fields, fieldKey)) {
                fields[fieldKey as keyof TValues].setError(issue.message);
              } else {
                formErrorSignal.value = issue.message;
              }
            }
          } else if ('value' in result && result.value !== undefined) {
            finalValues = result.value as TValues;
          }
        } catch (err: any) {
          if (epoch !== resetEpoch) return false;
          allValid = false;
          formErrorSignal.value = err?.message || 'Validation error';
        }
      }

      if (epoch !== resetEpoch) return false;

      if (!allValid) {
        return false;
      }

      // 4. Run onSubmit
      await config.onSubmit(finalValues);
      return epoch === resetEpoch;
    } finally {
      if (epoch === resetEpoch) {
        submitInFlight = false;
        isSubmittingSignal.value = false;
      }
    }
  }

  return {
    fields,
    formError: computed(() => formErrorSignal.value),
    isValid,
    isSubmitting: computed(() => isSubmittingSignal.value),
    submit,
    handleSubmit: submit,
    reset
  };
}
