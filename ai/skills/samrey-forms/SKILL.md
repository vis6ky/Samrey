---
name: samrey-forms
description: Form management, schema validation, ARIA accessibility, input binding, and submission deduplication in @samrey/forms.
---

# Samrey Forms & Validation (`samrey-forms`)

## 1. Skill Description & Activation Criteria
- **Purpose**: Teaches how to build accessible, schema-validated forms with reactive error states and deduplicated submissions.
- **Activation Criteria**: Trigger when building login forms, registration forms, settings panels, data mutation dialogs, or handling input validation.

## 2. Framework Concepts
- **`createForm(config)`**: Generates reactive signals for `values`, `errors`, `touched`, `isSubmitting`, and `isValid`.
- **`bindField(input, form, fieldName)`**: Automatically synchronizes an input element with the reactive form instance and manages blur/change events.
- **`computeAriaAttributes(error, touched)`**: Generates accessible `aria-invalid` and `aria-describedby` attributes.
- **Submission Deduplication**: Protects against double-submits while `isSubmitting.value` is true.

## 3. Correct API Usage
```ts
import { createForm, bindField } from '@samrey/forms';

const form = createForm({
  initialValues: { email: '', password: '' },
  validate: (values) => {
    const errs: Record<string, string> = {};
    if (!values.email.includes('@')) errs.email = 'Valid email is required.';
    if (values.password.length < 8) errs.password = 'Password must be at least 8 chars.';
    return errs;
  },
  onSubmit: async (values) => {
    await api.login(values);
  }
});
```

## 4. Verified Code Example
```ts
import { createForm, bindField } from '@samrey/forms';
import { template, bindText, on } from '@samrey/runtime';

const _tmpl = template(`
  <form class="user-form">
    <label for="username">Username</label>
    <input id="username" ref="input" type="text" />
    <span ref="err" class="error"></span>
    <button ref="btn" type="submit">Save</button>
  </form>
`);

export function UserForm(props: { onSave: (name: string) => Promise<void> }) {
  const form = createForm({
    initialValues: { username: '' },
    validate: (v) => {
      const errs: Record<string, string> = {};
      if (!v.username.trim()) errs.username = 'Username cannot be blank.';
      return errs;
    },
    onSubmit: async (v) => {
      await props.onSave(v.username);
    }
  });

  const root = _tmpl.clone();
  const { input, err, btn } = root.refs;

  bindField(input as HTMLInputElement, form, 'username');
  bindText(err, () => form.errors.value.username ?? '');

  on(root, 'submit', (e) => {
    e.preventDefault();
    form.handleSubmit();
  });

  return root;
}
```

## 5. Common Mistakes
- **Mistake**: Forgetting `e.preventDefault()` on form submit.
  - *Correction*: Prevent native page reload and delegate to `form.handleSubmit()`.
- **Mistake**: Manually tracking touched states instead of using `bindField()`.
  - *Correction*: `bindField` manages blur events and touched states automatically.

## 6. Forbidden Patterns
- ❌ Do NOT use Formik, React Hook Form, or foreign form libraries.
- ❌ Do NOT store raw unvalidated user input directly into critical application state.

## 7. Validation Procedures
1. Run `npx @samrey/cli test` to verify validation logic.
2. Verify accessibility with `npx @samrey/cli audit --a11y`.

## 8. Authoritative Documentation
- [ai/API_CONTRACTS.md](../../API_CONTRACTS.md#5-samreyforms)
- [ai/EXAMPLES_INDEX.md](../../EXAMPLES_INDEX.md#4-example-3-accessible-form-validation)
