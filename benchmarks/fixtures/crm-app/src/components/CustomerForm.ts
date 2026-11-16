import { createForm, bindField } from '@samrey/forms';
import { template, bindText, on } from '@samrey/runtime';
import { CustomerStage } from '../stores/CrmStore.js';

const _tmpl = template(`
  <form class="customer-form" novalidate aria-label="Add new customer form">
    <div class="field-row">
      <label for="custName">Customer Name</label>
      <input id="custName" ref="nameInput" type="text" />
      <span ref="nameErr" class="field-error"></span>
    </div>
    <div class="field-row">
      <label for="custCompany">Company</label>
      <input id="custCompany" ref="companyInput" type="text" />
      <span ref="companyErr" class="field-error"></span>
    </div>
    <div class="field-row">
      <label for="custEmail">Email</label>
      <input id="custEmail" ref="emailInput" type="email" />
      <span ref="emailErr" class="field-error"></span>
    </div>
    <div class="field-row">
      <label for="custValue">Deal Value ($)</label>
      <input id="custValue" ref="valInput" type="number" />
    </div>
    <button ref="submitBtn" type="submit">Create Customer Record</button>
  </form>
`);

export function CustomerForm(props: {
  onSubmitCustomer: (data: { name: string; company: string; email: string; dealValue: number; stage: CustomerStage }) => void;
}) {
  const form = createForm({
    initialValues: { name: '', company: '', email: '', dealValue: '10000' },
    validate: (v) => {
      const errs: Record<string, string> = {};
      if (!v.name.trim()) errs.name = 'Customer name is required.';
      if (!v.company.trim()) errs.company = 'Company name is required.';
      if (!v.email.includes('@')) errs.email = 'Valid corporate email is required.';
      return errs;
    },
    onSubmit: async (v) => {
      props.onSubmitCustomer({
        name: v.name.trim(),
        company: v.company.trim(),
        email: v.email.trim(),
        dealValue: Number(v.dealValue) || 0,
        stage: 'Lead'
      });
      form.reset();
    }
  });

  const root = _tmpl.clone();
  const { nameInput, nameErr, companyInput, companyErr, emailInput, emailErr, valInput, submitBtn } = root.refs;

  bindField(nameInput as HTMLInputElement, form.fields.name);
  bindField(companyInput as HTMLInputElement, form.fields.company);
  bindField(emailInput as HTMLInputElement, form.fields.email);
  bindField(valInput as HTMLInputElement, form.fields.dealValue);

  bindText(nameErr, () => form.fields.name.error.value ?? '');
  bindText(companyErr, () => form.fields.company.error.value ?? '');
  bindText(emailErr, () => form.fields.email.error.value ?? '');

  on(root, 'submit', (e) => {
    e.preventDefault();
    form.handleSubmit();
  });

  return root;
}
