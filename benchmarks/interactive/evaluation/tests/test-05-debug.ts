/**
 * Evaluation Test Suite: Challenge 05 - Debug an Intentionally Broken Application
 */

import assert from 'node:assert/strict';
import { renderTest, fireEvent, flushReactivity } from '@samrey/testing';

export async function testDebugApp(moduleExports: any, sourceCode: string): Promise<{ passed: boolean; message: string; subtests: { name: string; passed: boolean; error?: string }[] }> {
  const subtests: { name: string; passed: boolean; error?: string }[] = [];

  // Subtest 1: Anti-pattern inspection (Static Analysis)
  try {
    const hasReactHooks = /useState|useEffect|useRef|useCallback|useMemo/.test(sourceCode);
    assert.equal(hasReactHooks, false, 'Source code must not contain React hooks (useState, useEffect, etc.)');

    const hasProhibitedShowTag = /<Show[\s>]/i.test(sourceCode);
    assert.equal(hasProhibitedShowTag, false, 'Source code must not contain <Show> HTML tag in template strings (SAMREY-108)');

    const hasInPlacePush = /\.value\.push\(|\.value\.splice\(|\.value\.sort\(/.test(sourceCode);
    assert.equal(hasInPlacePush, false, 'Source code must not mutate signal array in-place (.value.push)');

    subtests.push({ name: 'Anti-Pattern Static Elimination', passed: true });
  } catch (err: any) {
    subtests.push({ name: 'Anti-Pattern Static Elimination', passed: false, error: err.message });
  }

  const { TodoApp } = moduleExports;
  if (typeof TodoApp !== 'function') {
    return {
      passed: false,
      message: 'TodoApp function missing',
      subtests: [{ name: 'Export Check', passed: false, error: 'Expected TodoApp export' }, ...subtests]
    };
  }

  // Subtest 2: Initial rendering & count badge
  try {
    const { container } = renderTest(() => TodoApp());
    const countSpan = container.querySelector('[ref="count"]') || container.querySelector('.stats span');
    assert.ok(countSpan, 'Count element must exist');
    assert.ok(container.textContent?.includes('Master Samrey Reactivity'), 'Initial todo item should render');
    assert.equal(countSpan.textContent?.trim(), '1', 'Initial count should be 1');
    subtests.push({ name: 'Initial Render & Count Badge', passed: true });
  } catch (err: any) {
    subtests.push({ name: 'Initial Render & Count Badge', passed: false, error: err.message });
  }

  // Subtest 3: Adding new todo updates list and count
  try {
    const { container } = renderTest(() => TodoApp());
    const input = (container.querySelector('[ref="input"]') || container.querySelector('input')) as HTMLInputElement;
    const addBtn = container.querySelector('[ref="addBtn"]') || container.querySelector('.input-row button') || container.querySelector('button')!;
    const countSpan = container.querySelector('[ref="count"]') || container.querySelector('.stats span')!;

    input.value = 'Deploy with zero VDOM';
    fireEvent(input, 'input');
    fireEvent(addBtn, 'click');
    await flushReactivity();

    assert.ok(container.textContent?.includes('Deploy with zero VDOM'), 'New todo item must be rendered');
    assert.equal(countSpan.textContent?.trim(), '2', 'Count badge should increment to 2');
    subtests.push({ name: 'Add Todo & Reactive Update', passed: true });
  } catch (err: any) {
    subtests.push({ name: 'Add Todo & Reactive Update', passed: false, error: err.message });
  }

  // Subtest 4: Deleting todo updates list and count
  try {
    const { container } = renderTest(() => TodoApp());
    const countSpan = container.querySelector('[ref="count"]') || container.querySelector('.stats span')!;
    const delBtn = container.querySelector('.del-btn') || container.querySelector('li button');
    
    if (delBtn) {
      fireEvent(delBtn, 'click');
      await flushReactivity();
      assert.equal(countSpan.textContent?.trim(), '0', 'Count badge should decrement to 0');
      assert.ok(container.textContent?.includes('No tasks left') || !container.textContent?.includes('Master Samrey Reactivity'), 'Empty state or removal verified');
    }
    subtests.push({ name: 'Delete Todo & Empty State Handling', passed: true });
  } catch (err: any) {
    subtests.push({ name: 'Delete Todo & Empty State Handling', passed: false, error: err.message });
  }

  const allPassed = subtests.every(t => t.passed);
  return {
    passed: allPassed,
    message: allPassed ? 'All debug challenge tests passed' : 'Some debug challenge tests failed',
    subtests
  };
}
