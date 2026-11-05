---
name: samrey-forms
description: Build robust reactive forms with validation schemas (Zod/Valibot) and accessible ARIA attributes.
---

# Forms & Validation (@samrey/forms)

## Purpose
Instructs how to manage form input state, dirty/touched flags, field validation, and accessible error association.

## Relevant APIs
- `createForm<T>(config: FormConfig<T>): FormInstance<T>`
- `Field(props: FieldProps): Node`
- `useField(form: FormInstance, name: string): FieldState`

## Verified Code Example
```ts
import { createForm } from '@samrey/forms';
import { template, on, bindText } from '@samrey/runtime';

export function RegistrationForm() {
  const form = createForm({
    initialValues: { email: '', password: '' },
    validate: (values) => {
      const errors: Record<string, string> = {};
      if (!values.email.includes('@')) errors.email = 'Valid email is required.';
      if (values.password.length < 8) errors.password = 'Password must be at least 8 characters.';
      return errors;
    },
    onSubmit: async (values) => {
      await registerAccount(values);
    }
  });

  const root = template(`
<form class="reg-form">
  <div class="field">
    <label for="email">Email</label>
    <input id="email" type="email" />
    <span class="err-email text-red-600 text-sm"></span>
  </div>
  <button type="submit">Register</button>
</form>`)() as HTMLFormElement;

  const emailInput = root.querySelector('#email') as HTMLInputElement;
  const emailErr = root.querySelector('.err-email')!;

  on(emailInput, 'input', () => {
    form.setFieldValue('email', emailInput.value);
  });

  bindText(emailErr, () => form.errors.value.email || '');

  on(root, 'submit', (e) => {
    e.preventDefault();
    form.handleSubmit();
  });

  return root;
}
```
