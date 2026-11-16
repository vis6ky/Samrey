/**
 * Evaluation Test Suite: Challenge 04 - Validated Forms
 */

import assert from 'node:assert/strict';
import { renderTest, fireEvent, flushReactivity } from '@samrey/testing';

export async function testForms(moduleExports: any): Promise<{ passed: boolean; message: string; subtests: { name: string; passed: boolean; error?: string }[] }> {
  const subtests: { name: string; passed: boolean; error?: string }[] = [];

  const { CheckoutForm } = moduleExports;

  if (typeof CheckoutForm !== 'function') {
    return {
      passed: false,
      message: 'CheckoutForm function missing',
      subtests: [{ name: 'Export Check', passed: false, error: 'Expected CheckoutForm export' }]
    };
  }

  // Subtest 1: Form initial DOM structure
  try {
    const { container } = renderTest(() => CheckoutForm());
    const form = container.querySelector('form');
    const nameInput = container.querySelector('[name="fullName"]') || container.querySelector('[ref="nameInput"]');
    const emailInput = container.querySelector('[name="email"]') || container.querySelector('[ref="emailInput"]');
    const zipInput = container.querySelector('[name="zipCode"]') || container.querySelector('[ref="zipInput"]');
    const submitBtn = container.querySelector('button[type="submit"]') || container.querySelector('[ref="submitBtn"]');

    assert.ok(form, 'Form element must exist');
    assert.ok(nameInput, 'Full name input must exist');
    assert.ok(emailInput, 'Email input must exist');
    assert.ok(zipInput, 'ZIP input must exist');
    assert.ok(submitBtn, 'Submit button must exist');
    subtests.push({ name: 'Form DOM Structure & Controls', passed: true });
  } catch (err: any) {
    subtests.push({ name: 'Form DOM Structure & Controls', passed: false, error: err.message });
  }

  // Subtest 2: Validation failure on invalid inputs
  try {
    let submitted = false;
    const { container } = renderTest(() => CheckoutForm({ onSubmit: () => { submitted = true; } }));
    const form = container.querySelector('form')!;

    fireEvent(form, 'submit');
    await flushReactivity();

    assert.equal(submitted, false, 'Form should not submit with empty/invalid fields');
    const errorMessages = Array.from(container.querySelectorAll('.error-msg')).map(e => e.textContent?.trim()).filter(Boolean);
    assert.ok(errorMessages.length > 0, 'Validation errors should be rendered on invalid submit');
    subtests.push({ name: 'Validation Gating on Invalid Submit', passed: true });
  } catch (err: any) {
    subtests.push({ name: 'Validation Gating on Invalid Submit', passed: false, error: err.message });
  }

  // Subtest 3: Successful submit on valid input
  try {
    let submittedData: any = null;
    const { container } = renderTest(() => CheckoutForm({
      onSubmit: (values) => { submittedData = values; }
    }));

    const nameInput = (container.querySelector('[name="fullName"]') || container.querySelector('[ref="nameInput"]')) as HTMLInputElement;
    const emailInput = (container.querySelector('[name="email"]') || container.querySelector('[ref="emailInput"]')) as HTMLInputElement;
    const zipInput = (container.querySelector('[name="zipCode"]') || container.querySelector('[ref="zipInput"]')) as HTMLInputElement;
    const form = container.querySelector('form')!;

    nameInput.value = 'Alice Smith';
    fireEvent(nameInput, 'input');
    emailInput.value = 'alice@example.com';
    fireEvent(emailInput, 'input');
    zipInput.value = '90210';
    fireEvent(zipInput, 'input');

    fireEvent(form, 'submit');
    await flushReactivity();

    assert.ok(submittedData !== null || container.textContent?.includes('Order submitted successfully'), 'Submit callback called or success message shown');
    subtests.push({ name: 'Successful Submission Lifecycle', passed: true });
  } catch (err: any) {
    subtests.push({ name: 'Successful Submission Lifecycle', passed: false, error: err.message });
  }

  const allPassed = subtests.every(t => t.passed);
  return {
    passed: allPassed,
    message: allPassed ? 'All forms tests passed' : 'Some forms tests failed',
    subtests
  };
}
