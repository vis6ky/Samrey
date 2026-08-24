# Forms & Validation in Gati

## 1. Standard Schema Integration (`@gati/forms`)

Gati provides first-class support for any validator adhering to the [Standard Schema](https://standardschema.dev) specification (including Zod, Valibot, and ArkType), as well as custom validation functions.

### Creating a Reactive Form

```typescript
import { createForm } from '@gati/forms';

export function RegistrationForm() {
  const form = createForm({
    initialValues: {
      email: '',
      password: '',
      confirmPassword: ''
    },
    validators: {
      email: (val: string) => (val.includes('@') ? null : 'A valid email is required'),
      password: (val: string) => (val.length >= 8 ? null : 'Password must be at least 8 characters')
    },
    onSubmit: async (values) => {
      console.log('Form submitted successfully:', values);
    }
  });

  return form;
}
```

---

## 2. Automated ARIA & Accessibility Bindings

When a field has an error, `@gati/forms` automatically manages accessibility attributes on the input element:
- `aria-invalid="true"`
- `aria-describedby="[field-name]-error"`
- `aria-required="true"`

### Binding to DOM Elements

```typescript
import { bindField } from '@gati/forms';

const inputElement = document.querySelector('input[name="email"]') as HTMLInputElement;
const errorElement = document.querySelector('#email-error') as HTMLElement;

// Automatically syncs value, input events, blur validation, and ARIA attributes
bindField(inputElement, form.fields.email, {
  errorElement
});
```

---

## 3. Prototype Pollution Defense

`@gati/forms` scrubs `__proto__`, `constructor`, and `prototype` keys during form initialization and value updates, preventing malicious form fields from mutating the global JavaScript object prototype.
