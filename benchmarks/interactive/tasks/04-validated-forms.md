# Challenge 04: Implement Validated Forms

**Challenge ID:** `TASK-04-FORMS`  
**Difficulty:** Intermediate  
**Domain:** Reactive Form Handling, Field Validation & Two-Way Binding  
**Target Fixture:** `benchmarks/interactive/fixtures/04-validated-forms/`

---

## 1. Overview
In this challenge, you will implement an accessible, reactively validated checkout form using `@samrey/forms`, `@samrey/reactivity`, and `@samrey/runtime`.

---

## 2. Starting Project
The project is initialized at:
`benchmarks/interactive/fixtures/04-validated-forms/`

Contains:
- `package.json`
- `src/CheckoutForm.ts` (Stub to implement)

---

## 3. Exact Task Instructions
1. Open `src/CheckoutForm.ts`.
2. Implement and export `CheckoutForm(props?: { onSubmit?: (values: CheckoutValues) => void }): HTMLElement`.
3. Form data model:
   ```ts
   export interface CheckoutValues {
     fullName: string;
     email: string;
     zipCode: string;
   }
   ```
4. Form validation rules:
   - `fullName`: Required, must be at least 2 characters long. If invalid: `"Full name must be at least 2 characters"`.
   - `email`: Required, must contain `@` and `.`. If invalid: `"Please enter a valid email address"`.
   - `zipCode`: Required, must be exactly 5 digits (`/^\d{5}$/`). If invalid: `"ZIP code must be 5 digits"`.
5. Create the form using `createForm` from `@samrey/forms`:
   ```ts
   const form = createForm<CheckoutValues>({
     initialValues: { fullName: '', email: '', zipCode: '' },
     validate: (values) => { ... },
     onSubmit: async (values) => { ... }
   });
   ```
6. Hoist the static template at module scope with `ref` attributes:
   ```html
   <form class="checkout-form" novalidate>
     <div class="form-group">
       <label for="fullName">Full Name</label>
       <input ref="nameInput" id="fullName" name="fullName" type="text" />
       <span ref="nameError" class="error-msg" role="alert"></span>
     </div>
     <div class="form-group">
       <label for="email">Email</label>
       <input ref="emailInput" id="email" name="email" type="email" />
       <span ref="emailError" class="error-msg" role="alert"></span>
     </div>
     <div class="form-group">
       <label for="zipCode">ZIP Code</label>
       <input ref="zipInput" id="zipCode" name="zipCode" type="text" />
       <span ref="zipError" class="error-msg" role="alert"></span>
     </div>
     <button ref="submitBtn" type="submit">Complete Order</button>
     <div ref="successMsg" class="success-msg" style="display: none;">Order submitted successfully!</div>
   </form>
   ```
7. Clone template and bind fields:
   - Bind inputs using `bindField` or two-way bindings with reactive signals.
   - Bind error messages surgically with `bindText(errorSpan, () => form.fields.<name>.error.value || '')`.
   - Bind submit event with `on(root, 'submit', form.handleSubmit)` or custom submit handler that triggers validation and calls `props.onSubmit(values)` when valid.
   - Show `successMsg` upon successful submission.
8. Return the root form element.

---

## 4. Expected Functionality
- Entering invalid input and submitting displays targeted error messages next to the respective fields.
- Correcting an input clears its error reactively or upon re-validation.
- Submitting valid data invokes `props.onSubmit(values)` and renders the success message.
- Inputs maintain proper accessible markup (`role="alert"` on errors, explicit `<label>` associations).

---

## 5. Forbidden Patterns
- ❌ Do NOT use React Hook Form, Formik, or foreign form libraries.
- ❌ Do NOT perform full component re-renders on every keystroke.
- ❌ Do NOT write `<Show>` or `<For>` as HTML tags.
