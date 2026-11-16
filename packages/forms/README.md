# @samrey/forms

Type-safe reactive form container, Standard Schema validation, fine-grained field tracking, and automated ARIA accessibility attributes.

## Purpose

`@samrey/forms` manages complex form state and validation without triggering component re-renders. Every form field is backed by fine-grained signals (`value`, `error`, `touched`, `dirty`, `isValidating`, `aria`) and auto-generates accessible ARIA attributes.

## Installation

```bash
npm install @samrey/forms @samrey/reactivity @samrey/runtime
```

## Quick Example

```ts
import { createForm, bindField, validators } from '@samrey/forms';
import { el } from '@samrey/runtime';

const form = createForm({
  initialValues: {
    username: '',
    email: ''
  },
  validators: {
    username: [validators.required('Username is required'), validators.minLength(3, 'Minimum 3 characters')],
    email: [validators.required('Email is required'), validators.email('Invalid email address')]
  },
  onSubmit: async (values) => {
    console.log('Submitted values:', values);
  }
});

const usernameInput = el('input', { type: 'text' });
bindField(usernameInput, form.fields.username);
```

## API

- `createForm<TValues extends Record<string, any>>(config: FormConfig<TValues>): FormInstance<TValues>` — Creates a reactive form instance with validation, `fields`, `submit`, `handleSubmit`, and `reset`.
- `createField<T>(name: string, initialValue: T, validatorOrConfig?: Validator<T> | { validator?: Validator<T>; required?: boolean }, options?: { required?: boolean }): FieldState<T>` — Creates a standalone reactive field with signal state and validation.
- `bindField<T>(element: any, field: FieldState<T>, options?: BindFieldOptions): void` — Binds reactive two-way DOM value/checked state, accessibility attributes (`aria-invalid`, `aria-errormessage`, `aria-describedby`, `aria-required`), and input/change/blur listeners directly to an element.
- `getAccessibleFieldProps(field: FieldState<any>): AriaBindingAttributes` — Returns ARIA props for accessible field rendering.
- `validateSchema(schema, values)` — Executes a Standard Schema v1 validator against form values.
- `validators.required(message?)` — Required value rule.
- `validators.email(message?)` — Email format validator.
- `validators.minLength(min, message?)` — Minimum length validator.
- `validators.maxLength(max, message?)` — Maximum length validator.
- `validators.pattern(regex, message?)` — Regular expression validator.
- `validators.custom(fn)` — Custom synchronous or asynchronous validator.

## Environment

Universal: Node.js (for form data processing) and browser environments.

## Security

Automatic input sanitization, prototype pollution protection on nested fields, and support for anti-CSRF token integration.

## Related Packages

- `@samrey/reactivity` — Drives per-field reactive signals.
- `@samrey/runtime` — DOM element binding helpers.

