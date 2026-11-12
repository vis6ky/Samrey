# @samrey/forms

Type-safe reactive form container, Standard Schema validation, fine-grained field tracking, and automated ARIA accessibility attributes.

## Purpose

`@samrey/forms` manages complex form state and validation without triggering component re-renders. Every form field is backed by fine-grained signals (`value`, `errors`, `touched`, `dirty`, `validating`) and auto-generates accessible ARIA attributes.

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

const usernameInput = el('input', { type: 'text', ...bindField(form.fields.username) });
```

## API

- `createForm(options: FormConfig<T>): FormInstance<T>` — Creates a reactive form instance with validation, `fields`, `submit`, `handleSubmit`, and `reset`.
- `createField(options: FieldOptions<T>): FieldState<T>` — Creates a standalone reactive field with signal state and validation.
- `bindField(field: FieldState<string>, options?): FieldBindings` — Generates reactive two-way DOM attributes and accessibility props (`aria-invalid`, `aria-describedby`).
- `getAccessibleFieldProps(field: FieldState<any>, errorId?: string)` — Returns reactive ARIA props for accessible field rendering.
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

