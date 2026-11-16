/**
 * Evaluation Test Suite: Challenge 02 - Reusable Components
 */

import assert from 'node:assert/strict';
import { renderTest } from '@samrey/testing';

export async function testComponents(badgeExports: any, userCardExports: any): Promise<{ passed: boolean; message: string; subtests: { name: string; passed: boolean; error?: string }[] }> {
  const subtests: { name: string; passed: boolean; error?: string }[] = [];

  const { Badge } = badgeExports;
  const { UserCard } = userCardExports;

  if (typeof Badge !== 'function') {
    return {
      passed: false,
      message: 'Badge component function is not exported',
      subtests: [{ name: 'Badge Export Check', passed: false, error: 'Expected function export named "Badge"' }]
    };
  }

  if (typeof UserCard !== 'function') {
    return {
      passed: false,
      message: 'UserCard component function is not exported',
      subtests: [{ name: 'UserCard Export Check', passed: false, error: 'Expected function export named "UserCard"' }]
    };
  }

  // Subtest 1: Badge variants
  try {
    const { container: successBadge } = renderTest(() => Badge({ label: 'Online', variant: 'success' }));
    const successEl = successBadge.querySelector('.badge') || (successBadge.firstChild as HTMLElement);
    assert.ok(successBadge.textContent?.includes('Online'), 'Badge label should render');
    assert.ok(successEl?.className?.includes('badge-success'), 'Badge should have badge-success class');

    const { container: errorBadge } = renderTest(() => Badge({ label: 'Offline', variant: 'error' }));
    const errorEl = errorBadge.querySelector('.badge') || (errorBadge.firstChild as HTMLElement);
    assert.ok(errorEl?.className?.includes('badge-error'), 'Badge should have badge-error class');
    subtests.push({ name: 'Badge Variants & Classes', passed: true });
  } catch (err: any) {
    subtests.push({ name: 'Badge Variants & Classes', passed: false, error: err.message });
  }

  // Subtest 2: Default Badge variant is success
  try {
    const { container } = renderTest(() => Badge({ label: 'Active' }));
    const badgeEl = container.querySelector('.badge') || (container.firstChild as HTMLElement);
    assert.ok(badgeEl?.className?.includes('badge-success'), 'Default badge variant must be success');
    subtests.push({ name: 'Badge Default Variant', passed: true });
  } catch (err: any) {
    subtests.push({ name: 'Badge Default Variant', passed: false, error: err.message });
  }

  // Subtest 3: UserCard rendering
  try {
    const { container } = renderTest(() => UserCard({
      name: 'Sarah Connor',
      email: 'sarah@sky.net',
      role: 'Resistance Leader',
      status: 'active'
    }));

    const nameEl = container.querySelector('[ref="name"]') || container.querySelector('h3');
    const emailEl = container.querySelector('[ref="email"]') || container.querySelector('p');
    const badgeEl = container.querySelector('.badge') || container.querySelector('[ref="badge"]');

    assert.ok(nameEl, 'Name element must exist');
    assert.equal(nameEl.textContent?.trim(), 'Sarah Connor');
    assert.ok(emailEl, 'Email element must exist');
    assert.equal(emailEl.textContent?.trim(), 'sarah@sky.net');
    assert.ok(badgeEl, 'Badge must be mounted in UserCard');
    assert.ok(badgeEl.textContent?.includes('Active'));
    assert.ok(badgeEl.className.includes('badge-success'));
    subtests.push({ name: 'UserCard Active Status Rendering', passed: true });
  } catch (err: any) {
    subtests.push({ name: 'UserCard Active Status Rendering', passed: false, error: err.message });
  }

  // Subtest 4: UserCard suspended status
  try {
    const { container } = renderTest(() => UserCard({
      name: 'John Doe',
      email: 'john@example.com',
      role: 'Auditor',
      status: 'suspended'
    }));

    const badgeEl = container.querySelector('.badge') || container.querySelector('[ref="badge"]');
    assert.ok(badgeEl, 'Badge must be mounted in UserCard');
    assert.ok(badgeEl.textContent?.includes('Suspended'));
    assert.ok(badgeEl.className.includes('badge-error'));
    subtests.push({ name: 'UserCard Suspended Status Rendering', passed: true });
  } catch (err: any) {
    subtests.push({ name: 'UserCard Suspended Status Rendering', passed: false, error: err.message });
  }

  const allPassed = subtests.every(t => t.passed);
  return {
    passed: allPassed,
    message: allPassed ? 'All component tests passed' : 'Some component tests failed',
    subtests
  };
}
