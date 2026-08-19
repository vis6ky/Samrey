import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createField, createForm, computeAriaAttributes } from '../src/index.js';

describe('@aether/forms', () => {
  it('tracks field value, dirty, and error state reactively', () => {
    const emailField = createField('email', '', (val) => {
      if (!val.includes('@')) return 'Invalid email address';
      return null;
    });

    assert.equal(emailField.value.value, '');
    assert.equal(emailField.dirty.value, false);
    assert.equal(emailField.error.value, null);

    emailField.setValue('invalid');
    assert.equal(emailField.dirty.value, true);

    // Touch field to trigger validation
    emailField.setTouched(true);
    assert.equal(emailField.error.value, 'Invalid email address');
    assert.equal(emailField.aria.value['aria-invalid'], true);

    emailField.setValue('team@aether.dev');
    assert.equal(emailField.error.value, null);
    assert.equal(emailField.aria.value['aria-invalid'], undefined);
  });

  it('computes correct ARIA accessible attributes', () => {
    const validAria = computeAriaAttributes('username', false, true);
    assert.equal(validAria['aria-required'], true);
    assert.equal(validAria['aria-invalid'], undefined);

    const invalidAria = computeAriaAttributes('username', true, true);
    assert.equal(invalidAria['aria-required'], true);
    assert.equal(invalidAria['aria-invalid'], true);
    assert.equal(invalidAria['aria-errormessage'], 'username-error');
  });

  it('handles form submission lifecycle and validation gating', async () => {
    let submittedData: unknown = null;

    const form = createForm({
      initialValues: { username: '', role: 'developer' },
      validators: {
        username: (val) => (val ? null : 'Username is required')
      },
      onSubmit: async (values) => {
        submittedData = values;
      }
    });

    // Submitting with empty username should fail
    const success1 = await form.submit();
    assert.equal(success1, false);
    assert.equal(submittedData, null);
    assert.equal(form.fields.username.error.value, 'Username is required');

    // Fill valid username
    form.fields.username.setValue('architect');
    const success2 = await form.submit();
    assert.equal(success2, true);
    assert.deepEqual(submittedData, { username: 'architect', role: 'developer' });
  });
});
