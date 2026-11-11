import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createField, createForm, computeAriaAttributes, StandardSchemaV1, bindField, validators } from '../src/index.js';

describe('@samrey/forms', () => {
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

    emailField.setValue('team@samrey.dev');
    assert.equal(emailField.error.value, null);
    assert.equal(emailField.aria.value['aria-invalid'], undefined);
  });

  it('handles asynchronous field validators without assigning raw Promise to error signal', async () => {
    const usernameField = createField('username', 'existing_user', async (val) => {
      await new Promise((r) => setTimeout(r, 10));
      return val === 'existing_user' ? 'Username already taken' : null;
    });

    assert.equal(usernameField.error.value, null);

    usernameField.setTouched(true);
    // While validating or right after trigger, error must NOT be [object Promise]
    assert.ok(typeof usernameField.error.value !== 'object' || usernameField.error.value === null, 'Error must not be a Promise object');

    const valid = await usernameField.validate();
    assert.equal(valid, false);
    assert.equal(usernameField.error.value, 'Username already taken');

    usernameField.setValue('new_unique_user');
    const valid2 = await usernameField.validate();
    assert.equal(valid2, true);
    assert.equal(usernameField.error.value, null);
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

  it('handles form submission lifecycle and validation gating without schema', async () => {
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

  it('executes synchronous Standard Schema (~v1) validation on submit', async () => {
    let submittedData: unknown = null;

    type SignupValues = {
      email: string;
      age: number;
    };

    const mockStandardSchema: StandardSchemaV1<SignupValues> = {
      '~standard': {
        version: 1,
        vendor: 'samrey-zod-mock',
        validate: (input: unknown) => {
          const values = input as SignupValues;
          const issues: { message: string; path?: (string | number)[] }[] = [];
          if (!values.email || !values.email.includes('@')) {
            issues.push({ message: 'Must be a valid email', path: ['email'] });
          }
          if (values.age < 18) {
            issues.push({ message: 'Must be 18 or older', path: ['age'] });
          }
          if (issues.length > 0) {
            return { issues };
          }
          return { value: values };
        }
      }
    };

    const form = createForm<SignupValues>({
      initialValues: { email: '', age: 16 },
      schema: mockStandardSchema,
      onSubmit: (values) => {
        submittedData = values;
      }
    });

    // Submit with invalid values
    const result1 = await form.submit();
    assert.equal(result1, false);
    assert.equal(submittedData, null);
    assert.equal(form.fields.email.error.value, 'Must be a valid email');
    assert.equal(form.fields.age.error.value, 'Must be 18 or older');

    // Fix values and submit again
    form.fields.email.setValue('user@example.com');
    form.fields.age.setValue(25);

    const result2 = await form.submit();
    assert.equal(result2, true);
    assert.deepEqual(submittedData, { email: 'user@example.com', age: 25 });
  });

  it('executes asynchronous Standard Schema (~v1) validation with form-level issues', async () => {
    let submittedData: unknown = null;

    type LoginForm = {
      username: string;
    };

    const asyncStandardSchema: StandardSchemaV1<LoginForm> = {
      '~standard': {
        version: 1,
        vendor: 'samrey-async-schema',
        validate: async (input: unknown) => {
          const values = input as LoginForm;
          // Simulate async DB check
          if (values.username === 'banned_user') {
            return {
              issues: [{ message: 'This account has been suspended' }] // form-level (empty path)
            };
          }
          return { value: values };
        }
      }
    };

    const form = createForm<LoginForm>({
      initialValues: { username: 'banned_user' },
      schema: asyncStandardSchema,
      onSubmit: (val) => {
        submittedData = val;
      }
    });

    const success1 = await form.submit();
    assert.equal(success1, false);
    assert.equal(form.formError.value, 'This account has been suspended');
    assert.equal(submittedData, null);

    form.fields.username.setValue('clean_user');
    const success2 = await form.submit();
    assert.equal(success2, true);
    assert.equal(form.formError.value, null);
    assert.deepEqual(submittedData, { username: 'clean_user' });
  });

  it('validates using built-in validators and binds element with bindField', () => {
    assert.equal(validators.required()(''), 'Field is required');
    assert.equal(validators.required()('ok'), null);
    assert.equal(validators.email()('invalid'), 'Invalid email address');
    assert.equal(validators.email()('test@example.com'), null);
    assert.equal(validators.minLength(3)('ab'), 'Minimum length is 3');
    assert.equal(validators.minLength(3)('abc'), null);

    const field = createField('test', 'init');
    const input: any = { value: '', listeners: {} as Record<string, Function> };
    input.addEventListener = (ev: string, fn: Function) => { input.listeners[ev] = fn; };
    bindField(input, field);
    assert.equal(input.value, 'init');
  });

  it('updates bound DOM input when field.setValue is called programmatically (two-way binding)', () => {
    const field = createField('username', 'alice');
    const listeners: Record<string, Function[]> = {};
    const inputElement = {
      value: '',
      type: 'text',
      addEventListener: (type: string, fn: any) => {
        listeners[type] = listeners[type] || [];
        listeners[type].push(fn);
      },
      removeEventListener: (type: string, fn: any) => {
        listeners[type] = (listeners[type] || []).filter((f) => f !== fn);
      }
    };

    bindField(inputElement, field);
    assert.equal(inputElement.value, 'alice');

    // Programmatic update
    field.setValue('bob');
    assert.equal(inputElement.value, 'bob');

    // User input event
    listeners['input'][0]({ target: { value: 'charlie' } });
    assert.equal(field.value.value, 'charlie');
  });

  it('discards stale asynchronous validator resolutions to prevent race overwrites (Bug 13c)', async () => {
    let resolveFirst!: (msg: string | null) => void;
    let resolveSecond!: (msg: string | null) => void;
    let callNum = 0;

    const field = createField('username', '', () => {
      callNum++;
      if (callNum === 1) {
        return new Promise<string | null>((r) => {
          resolveFirst = r;
        });
      }
      return new Promise<string | null>((r) => {
        resolveSecond = r;
      });
    });

    field.setValue('stale');
    field.setTouched(true); // fires call #1
    field.setValue('valid_new'); // fires call #2 because already touched

    assert.equal(callNum, 2);
    assert.equal(field.isValidating.value, true);

    // Second (newer) validation finishes first cleanly
    resolveSecond(null);
    await new Promise((r) => setTimeout(r, 0));
    assert.equal(field.error.value, null);
    assert.equal(field.isValidating.value, false);

    // First (stale) validation rejects or resolves with an error afterwards — must be ignored
    resolveFirst('Username stale is taken');
    await new Promise((r) => setTimeout(r, 0));
    assert.equal(field.error.value, null);
    assert.equal(field.isValidating.value, false);
  });

  it('F-07: safely skips __proto__/constructor/prototype keys during createForm and reset()', async () => {
    const initialValues = JSON.parse('{"__proto__":"polluted","constructor":"ctor","prototype":"proto","username":"alice"}') as Record<string, string>;
    let submitted: Record<string, string> | null = null;

    const form = createForm({
      initialValues,
      onSubmit: (values) => {
        submitted = { ...values };
      }
    });

    assert.equal(form.fields.username.value.value, 'alice');
    assert.equal('constructor' in form.fields, false);
    assert.equal('prototype' in form.fields, false);

    form.fields.username.setValue('bob');
    form.fields.username.setError('Temporary');
    form.fields.username.setTouched(true);

    assert.doesNotThrow(() => {
      form.reset();
    }, 'form.reset() must not throw TypeError when initialValues contains skipped prototype keys');

    assert.equal(form.fields.username.value.value, 'alice');
    assert.equal(form.fields.username.error.value, null);
    assert.equal(form.fields.username.touched.value, false);

    const ok = await form.submit();
    assert.equal(ok, true);
    assert.deepEqual(submitted, { username: 'alice' });
  });
});
