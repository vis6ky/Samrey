import { template, on, bindText } from '@samrey/runtime';
import { createForm } from '@samrey/forms';

export interface CheckoutValues {
  fullName: string;
  email: string;
  zipCode: string;
}

export function CheckoutForm(props?: { onSubmit?: (values: CheckoutValues) => void }): HTMLElement {
  // TODO: Implement according to benchmarks/interactive/tasks/04-validated-forms.md
  throw new Error('Not implemented');
}
