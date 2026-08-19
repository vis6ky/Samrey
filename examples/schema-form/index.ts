import { createForm } from '../../packages/forms/src/index.js';

export function runFormExample() {
  const form = createForm({
    initialValues: {
      email: '',
      password: ''
    },
    validators: {
      email: (v) => (v.includes('@') ? null : 'Valid email required'),
      password: (v) => (v.length >= 8 ? null : 'Password must be at least 8 chars')
    },
    onSubmit: (values) => {
      console.log('Submitted form:', values);
    }
  });

  return form;
}
