/**
 * Evaluation Test Suite: Challenge 01 - Reactive Counter
 */

import assert from 'node:assert/strict';
import { renderTest, fireEvent, flushReactivity } from '@samrey/testing';

export async function testCounter(moduleExports: any): Promise<{ passed: boolean; message: string; subtests: { name: string; passed: boolean; error?: string }[] }> {
  const subtests: { name: string; passed: boolean; error?: string }[] = [];

  const { Counter } = moduleExports;
  if (typeof Counter !== 'function') {
    return {
      passed: false,
      message: 'Counter component function is not exported',
      subtests: [{ name: 'Export Check', passed: false, error: 'Expected function export named "Counter"' }]
    };
  }

  // Subtest 1: Renders initial value
  try {
    const { container } = renderTest(() => Counter({ initial: 10 }));
    const countSpan = container.querySelector('[ref="count"]') || container.querySelector('span');
    assert.ok(countSpan, 'Count element must exist');
    assert.equal(countSpan.textContent?.trim(), '10', 'Initial count should match props.initial');
    subtests.push({ name: 'Initial Value Rendering', passed: true });
  } catch (err: any) {
    subtests.push({ name: 'Initial Value Rendering', passed: false, error: err.message });
  }

  // Subtest 2: Default initial value is 0
  try {
    const { container } = renderTest(() => Counter());
    const countSpan = container.querySelector('[ref="count"]') || container.querySelector('span');
    assert.ok(countSpan, 'Count element must exist');
    assert.equal(countSpan.textContent?.trim(), '0', 'Default count should be 0');
    subtests.push({ name: 'Default Initial Value', passed: true });
  } catch (err: any) {
    subtests.push({ name: 'Default Initial Value', passed: false, error: err.message });
  }

  // Subtest 3: Increment functionality
  try {
    const { container } = renderTest(() => Counter({ initial: 0 }));
    const incBtn = container.querySelector('[ref="inc"]') || container.querySelector('button[aria-label="Increment"]') || container.querySelectorAll('button')[1];
    const countSpan = container.querySelector('[ref="count"]') || container.querySelector('span')!;
    assert.ok(incBtn, 'Increment button must exist');

    fireEvent(incBtn, 'click');
    await flushReactivity();
    assert.equal(countSpan.textContent?.trim(), '1', 'Count should increment to 1');

    fireEvent(incBtn, 'click');
    await flushReactivity();
    assert.equal(countSpan.textContent?.trim(), '2', 'Count should increment to 2');
    subtests.push({ name: 'Increment Functionality', passed: true });
  } catch (err: any) {
    subtests.push({ name: 'Increment Functionality', passed: false, error: err.message });
  }

  // Subtest 4: Decrement functionality
  try {
    const { container } = renderTest(() => Counter({ initial: 5 }));
    const decBtn = container.querySelector('[ref="dec"]') || container.querySelector('button[aria-label="Decrement"]') || container.querySelectorAll('button')[0];
    const countSpan = container.querySelector('[ref="count"]') || container.querySelector('span')!;
    assert.ok(decBtn, 'Decrement button must exist');

    fireEvent(decBtn, 'click');
    await flushReactivity();
    assert.equal(countSpan.textContent?.trim(), '4', 'Count should decrement to 4');
    subtests.push({ name: 'Decrement Functionality', passed: true });
  } catch (err: any) {
    subtests.push({ name: 'Decrement Functionality', passed: false, error: err.message });
  }

  // Subtest 5: Reset functionality
  try {
    const { container } = renderTest(() => Counter({ initial: 7 }));
    const incBtn = container.querySelector('[ref="inc"]') || container.querySelectorAll('button')[1];
    const resetBtn = container.querySelector('[ref="reset"]') || Array.from(container.querySelectorAll('button')).find(b => b.textContent?.includes('Reset'));
    const countSpan = container.querySelector('[ref="count"]') || container.querySelector('span')!;
    assert.ok(resetBtn, 'Reset button must exist');

    fireEvent(incBtn!, 'click');
    await flushReactivity();
    assert.equal(countSpan.textContent?.trim(), '8');

    fireEvent(resetBtn!, 'click');
    await flushReactivity();
    assert.equal(countSpan.textContent?.trim(), '7', 'Reset should restore initial count');
    subtests.push({ name: 'Reset Functionality', passed: true });
  } catch (err: any) {
    subtests.push({ name: 'Reset Functionality', passed: false, error: err.message });
  }

  const allPassed = subtests.every(t => t.passed);
  return {
    passed: allPassed,
    message: allPassed ? 'All counter functional tests passed' : 'Some counter tests failed',
    subtests
  };
}
