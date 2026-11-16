/**
 * Reference Solution: Challenge 04 - Validated Forms
 */

import { template, on, bindText } from '@samrey/runtime';
import { createForm, bindField } from '@samrey/forms';

export interface CheckoutValues {
  fullName: string;
  email: string;
  zipCode: string;
}

const _formTmpl = template(`
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
`);

export function CheckoutForm(props?: { onSubmit?: (values: CheckoutValues) => void }): HTMLElement {
  const form = createForm<CheckoutValues>({
    initialValues: { fullName: '', email: '', zipCode: '' },
    validators: {
      fullName: (val: string) => (!val || val.length < 2 ? 'Full name must be at least 2 characters' : null),
      email: (val: string) => (!val || !val.includes('@') || !val.includes('.') ? 'Please enter a valid email address' : null),
      zipCode: (val: string) => (!/^\d{5}$/.test(val) ? 'ZIP code must be 5 digits' : null)
    },
    onSubmit: (values: CheckoutValues) => {
      successMsg.style.display = 'block';
      if (props?.onSubmit) {
        props.onSubmit(values);
      }
    }
  });

  const root = _formTmpl.clone();
  const { nameInput, nameError, emailInput, emailError, zipInput, zipError, submitBtn, successMsg } = root.refs;

  bindField(nameInput, form.fields.fullName);
  bindField(emailInput, form.fields.email);
  bindField(zipInput, form.fields.zipCode);

  bindText(nameError, () => form.fields.fullName.error.value ?? '');
  bindText(emailError, () => form.fields.email.error.value ?? '');
  bindText(zipError, () => form.fields.zipCode.error.value ?? '');

  on(root, 'submit', async (e: Event) => {
    e.preventDefault();
    await form.submit();
  });

  return root;
}
