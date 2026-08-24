# @gati/forms

Type-safe reactive form container, Standard Schema validation, fine-grained field tracking, and automated ARIA accessibility attributes.

## Purpose

`@gati/forms` manages complex form state and validation without triggering component re-renders. Every form field is backed by fine-grained signals (`value`, `errors`, `touched`, `dirty`, `validating`) and auto-generates accessible ARIA attributes.

## Installation

```bash
npm install @gati/forms @gati/reactivity @gati/runtime
```

## Quick Example

```ts
import { createForm, validators } from '@gati/forms';
import { el } from '@gati/runtime';

const form = createForm({
  initialValues: {
    username: '',
    email: ''
  },
  rules: {
    username: [validators.required('Username is required'), validators.minLength(3, 'Minimum 3 characters')],
    email: [validators.required('Email is required'), validators.email('Invalid email address')]
  },
  onSubmit: async (values) => {
    console.log('Submitted values:', values);
  }
});

const usernameField = form.register('username');
```

## API

- `createForm(options: FormOptions<T>): Form<T>` — Creates a reactive form instance with validation and submission lifecycle.
- `Form.register(fieldName: keyof T): FieldBindings` — Generates reactive two-way DOM attributes and accessibility props (`aria-invalid`, `aria-describedby`).
- `Form.handleSubmit(fn?: SubmitHandler<T>): (e?: Event) => Promise<void>` — Submits the form after triggering full validation.
- `Form.reset(): void` — Resets all fields back to initial values and clears dirty/touched flags.
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

- `@gati/reactivity` — Drives per-field reactive signals.
- `@gati/runtime` — DOM element binding helpers.

