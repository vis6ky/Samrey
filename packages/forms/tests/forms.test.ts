import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createField, createForm, computeAriaAttributes, getAccessibleFieldProps, StandardSchemaV1, bindField, validators } from '../src/index.js';

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

  it('invokes field validators only once on blur and on form.submit()', async () => {
    let blurValidatorCalls = 0;
    const f = createField('name', '', (val) => {
      blurValidatorCalls++;
      return val ? null : 'Required';
    });

    const listeners: Record<string, Function[]> = {};
    const mockInput = {
      type: 'text',
      value: '',
      addEventListener: (evt: string, fn: Function) => {
        listeners[evt] = listeners[evt] || [];
        listeners[evt].push(fn);
      },
      removeEventListener: () => {}
    };
    bindField(mockInput, f);

    assert.equal(blurValidatorCalls, 0);
    for (const fn of listeners['blur'] || []) fn();
    assert.equal(blurValidatorCalls, 1, 'onBlur must invoke validator exactly once');
    assert.equal(f.error.value, 'Required');

    let submitValidatorCalls = 0;
    const form = createForm({
      initialValues: { email: 'bad' },
      validators: {
        email: (v) => {
          submitValidatorCalls++;
          return v.includes('@') ? null : 'Invalid';
        }
      },
      onSubmit: () => {}
    });
    const ok = await form.submit();
    assert.equal(ok, false);
    assert.equal(submitValidatorCalls, 1, 'form.submit() must invoke each field validator exactly once');
  });

  it('Batch 2 regression: guards concurrent submit() race, fixes reset() order/async race, fixes getAccessibleFieldProps, and supports validate + Validator[]', async () => {
    // 1. Concurrent submit() race with async validation + async onSubmit
    let resolveAsyncVal!: (msg: string | null) => void;
    let resolveSubmit!: () => void;
    let submitCalls = 0;

    const raceForm = createForm({
      initialValues: { username: 'alice' },
      validators: {
        username: () => new Promise<string | null>((r) => {
          resolveAsyncVal = r;
        })
      },
      onSubmit: async () => {
        submitCalls++;
        await new Promise<void>((r) => {
          resolveSubmit = r;
        });
      }
    });

    const s1 = raceForm.submit();
    const s2 = raceForm.submit();
    assert.equal(raceForm.isSubmitting.value, true, 'isSubmitting must be true immediately while async submit is in flight');
    resolveAsyncVal(null);
    await new Promise((r) => setTimeout(r, 5));
    assert.equal(submitCalls, 1, 'Concurrent submit() calls must NOT invoke onSubmit twice');
    resolveSubmit();
    const [r1, r2] = await Promise.all([s1, s2]);
    assert.deepEqual([r1, r2], [true, false]);
    assert.equal(raceForm.isSubmitting.value, false);

    // 2. form.reset() ordering & stale async validator cancellation
    let validatorRuns = 0;
    let resolveSlow!: (msg: string | null) => void;
    const resetForm = createForm({
      initialValues: { email: 'init@samrey.dev' },
      validators: {
        email: (val) => {
          validatorRuns++;
          if (val === 'slow@bad') {
            return new Promise<string | null>((r) => {
              resolveSlow = r;
            });
          }
          return val.includes('@') ? null : 'Bad email';
        }
      },
      onSubmit: () => {}
    });

    resetForm.fields.email.setTouched(true, false);
    resetForm.fields.email.setValue('slow@bad');
    assert.equal(validatorRuns, 1);
    resetForm.reset();
    assert.equal(validatorRuns, 1, 'form.reset() must setTouched(false) BEFORE setValue() so reset never fires validator');
    assert.equal(resetForm.fields.email.touched.value, false);
    assert.equal(resetForm.fields.email.error.value, null);
    assert.equal(resetForm.fields.email.value.value, 'init@samrey.dev');

    // Resolving slow validation from pre-reset must not taint freshly reset field
    resolveSlow('Stale pre-reset error');
    await new Promise((r) => setTimeout(r, 5));
    assert.equal(resetForm.fields.email.error.value, null, 'Stale async validator must not resurrect error after reset()');

    // 3. getAccessibleFieldProps must NOT treat signal function reference as truthy error
    const cleanField = createField('username', 'alice');
    const cleanProps = getAccessibleFieldProps(cleanField);
    assert.equal(cleanProps['aria-invalid'], undefined, 'Valid field with error.value === null must NOT set aria-invalid=true');
    cleanField.setError('Required');
    const errProps = getAccessibleFieldProps(cleanField);
    assert.equal(errProps['aria-invalid'], true);
    assert.equal(errProps['aria-errormessage'], 'username-error');

    // 4. Documented validate() callback + Validator[] array rules
    const docForm = createForm({
      initialValues: { email: 'bad', username: 'a' },
      validators: {
        username: [validators.required('Req'), validators.minLength(3, 'Min 3')]
      },
      validate: (vals) => {
        const errs: Record<string, string> = {};
        if (!vals.email.includes('@')) errs.email = 'Valid email is required';
        return errs;
      },
      onSubmit: () => {}
    });
    const okDoc = await docForm.submit();
    assert.equal(okDoc, false);
    assert.equal(docForm.fields.username.error.value, 'Min 3');
    assert.equal(docForm.fields.email.error.value, 'Valid email is required');
  });

  it('Item 5 regression: cancels in-flight async submit validation on form.reset() and wires FieldConfig.required into ARIA', async () => {
    // 1. reset() called while async form.validate() is pending (rejects with error later)
    let resolveValidateErr!: (errs: Record<string, string>) => void;
    let errSubmitCalls = 0;
    const errRaceForm = createForm({
      initialValues: { email: 'alice@samrey.dev' },
      validate: () => new Promise<Record<string, string>>((r) => { resolveValidateErr = r; }),
      onSubmit: () => { errSubmitCalls++; }
    });
    const pendingErrSubmit = errRaceForm.submit();
    assert.equal(errRaceForm.isSubmitting.value, true);
    errRaceForm.reset();
    assert.equal(errRaceForm.isSubmitting.value, false, 'reset() must clear isSubmitting immediately');
    resolveValidateErr({ email: 'Late validation error' });
    const errResult = await pendingErrSubmit;
    assert.equal(errResult, false);
    assert.equal(errSubmitCalls, 0);
    assert.equal(errRaceForm.fields.email.error.value, null, 'Late async validate() result after reset() must not write field errors');
    assert.equal(errRaceForm.formError.value, null);

    // 2. reset() called while async field validator is pending (resolves valid later -> must NOT run onSubmit)
    let resolveFieldValid!: (err: string | null) => void;
    let validSubmitCalls = 0;
    const validRaceForm = createForm({
      initialValues: { username: 'alice' },
      validators: {
        username: () => new Promise<string | null>((r) => { resolveFieldValid = r; })
      },
      onSubmit: () => { validSubmitCalls++; }
    });
    const pendingValidSubmit = validRaceForm.submit();
    validRaceForm.reset();
    resolveFieldValid(null);
    const validResult = await pendingValidSubmit;
    assert.equal(validResult, false, 'Reset during async field validation must abort submission even when validator passes');
    assert.equal(validSubmitCalls, 0, 'onSubmit must NOT run after form.reset()');

    // 3. FieldConfig.required reflected in field.required, ariaSignal, and getAccessibleFieldProps
    const reqField = createField('apiKey', '', { required: true });
    assert.equal(reqField.required, true);
    assert.equal(reqField.aria.value['aria-required'], true);
    assert.equal(getAccessibleFieldProps(reqField)['aria-required'], true);

    const reqForm = createForm({
      initialValues: { title: '', subtitle: '' },
      validators: { subtitle: validators.required('Subtitle required') },
      required: { title: true },
      onSubmit: () => {}
    });
    assert.equal(reqForm.fields.title.required, true);
    assert.equal(reqForm.fields.title.aria.value['aria-required'], true);
    assert.equal(reqForm.fields.subtitle.required, true);
    assert.equal(reqForm.fields.subtitle.aria.value['aria-required'], true);

    // 4. Starting a new submit immediately after reset() while prior async submit is still pending
    let resolveFirstVal!: (errs: Record<string, string>) => void;
    let resolveSecondVal!: (errs: Record<string, string>) => void;
    let valCall = 0;
    let secondSubmitCount = 0;
    const overlapForm = createForm({
      initialValues: { name: 'bob' },
      validate: () => new Promise<Record<string, string>>((r) => {
        valCall++;
        if (valCall === 1) resolveFirstVal = r;
        else resolveSecondVal = r;
      }),
      onSubmit: () => { secondSubmitCount++; }
    });
    const overlap1 = overlapForm.submit();
    overlapForm.reset();
    const overlap2 = overlapForm.submit();
    assert.equal(overlapForm.isSubmitting.value, true);
    resolveFirstVal({ name: 'Stale first submit error' });
    assert.equal(await overlap1, false);
    assert.equal(overlapForm.isSubmitting.value, true, 'Stale first submit finally must NOT clear isSubmitting of second submit');
    assert.equal(overlapForm.fields.name.error.value, null);
    resolveSecondVal({});
    assert.equal(await overlap2, true);
    assert.equal(secondSubmitCount, 1);
    assert.equal(overlapForm.isSubmitting.value, false);

    // 5. Synchronous validator throw must set field error cleanly instead of throwing uncaught; ARIA & onSubmit.reset()
    const throwingField = createField('code', '', () => {
      throw new Error('Sync validator boom');
    });
    assert.equal(throwingField.validate(), false);
    assert.equal(throwingField.error.value, 'Sync validator boom');
    assert.equal(throwingField.isValidating.value, false);
    // Explicit validate()/setError() error must match identically between field.aria and getAccessibleFieldProps
    assert.equal(throwingField.aria.value['aria-invalid'], true);
    assert.equal(getAccessibleFieldProps(throwingField)['aria-invalid'], true);
    throwingField.setError(null);
    assert.equal(throwingField.aria.value['aria-invalid'], undefined);
    assert.equal(getAccessibleFieldProps(throwingField)['aria-invalid'], undefined);

    const selfResetForm = createForm({
      initialValues: { msg: 'hello' },
      onSubmit: () => {
        selfResetForm.reset();
      }
    });
    assert.equal(await selfResetForm.submit(), true, 'submit() completing onSubmit that calls reset() must still return true');
  });
});
