/**
 * @license Apache-2.0
 * @aether/devtools - Forms & Validation State Inspector
 */

import { aetherDevToolsBridge } from './bridge.js';
import { sanitizePayload, isSensitiveKey } from './sanitizer.js';

export interface InspectedField {
  name: string;
  value: unknown;
  touched: boolean;
  dirty: boolean;
  valid: boolean;
  errors: string[];
}

export interface InspectedForm {
  name: string;
  valid: boolean;
  dirty: boolean;
  submitting: boolean;
  submitCount: number;
  fields: Record<string, InspectedField>;
  lastUpdated: number;
}

export class FormInspector {
  private forms = new Map<string, InspectedForm>();

  recordFormState(formName: string, formState: Omit<InspectedForm, 'name' | 'lastUpdated'>): void {
    const safeFields: Record<string, InspectedField> = {};
    for (const [fieldName, field] of Object.entries(formState.fields)) {
      const isSecret = isSensitiveKey(fieldName) || isSensitiveKey(field.name);
      safeFields[fieldName] = {
        ...field,
        value: isSecret ? '[REDACTED]' : sanitizePayload(field.value)
      };
    }

    const form: InspectedForm = {
      name: formName,
      valid: formState.valid,
      dirty: formState.dirty,
      submitting: formState.submitting,
      submitCount: formState.submitCount,
      fields: safeFields,
      lastUpdated: Date.now()
    };

    this.forms.set(formName, form);
    aetherDevToolsBridge.emit('form:change', form);
  }

  getForms(): InspectedForm[] {
    return Array.from(this.forms.values());
  }

  getForm(name: string): InspectedForm | undefined {
    return this.forms.get(name);
  }

  clear(): void {
    this.forms.clear();
  }
}

export const defaultFormInspector = new FormInspector();
