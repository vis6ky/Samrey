/**
 * Evaluation Test Suite: Challenge 03 - Routed Dashboard
 */

import assert from 'node:assert/strict';
import { renderTest, flushReactivity } from '@samrey/testing';

export async function testRouting(moduleExports: any): Promise<{ passed: boolean; message: string; subtests: { name: string; passed: boolean; error?: string }[] }> {
  const subtests: { name: string; passed: boolean; error?: string }[] = [];

  const { OverviewView, SettingsView, NotFoundView, router, DashboardLayout } = moduleExports;

  if (typeof OverviewView !== 'function' || typeof SettingsView !== 'function') {
    return {
      passed: false,
      message: 'View component functions missing',
      subtests: [{ name: 'Views Export Check', passed: false, error: 'Expected OverviewView and SettingsView' }]
    };
  }

  if (typeof DashboardLayout !== 'function') {
    return {
      passed: false,
      message: 'DashboardLayout function missing',
      subtests: [{ name: 'Layout Export Check', passed: false, error: 'Expected DashboardLayout' }]
    };
  }

  // Subtest 1: Views return HTML elements with correct titles
  try {
    const overviewEl = OverviewView();
    assert.ok(overviewEl.textContent?.includes('System Overview'), 'OverviewView should contain header');

    const settingsEl = SettingsView();
    assert.ok(settingsEl.textContent?.includes('Account Settings'), 'SettingsView should contain header');
    subtests.push({ name: 'View Components Rendering', passed: true });
  } catch (err: any) {
    subtests.push({ name: 'View Components Rendering', passed: false, error: err.message });
  }

  // Subtest 2: DashboardLayout mounts navigation links and outlet
  try {
    const { container } = renderTest(() => DashboardLayout());
    const links = Array.from(container.querySelectorAll('a'));
    assert.ok(links.length >= 2, 'Should render at least 2 navigation links');
    assert.ok(links.some(l => l.getAttribute('href') === '/' || l.textContent?.includes('Overview')), 'Should have Overview link');
    assert.ok(links.some(l => l.getAttribute('href') === '/settings' || l.textContent?.includes('Settings')), 'Should have Settings link');
    subtests.push({ name: 'Dashboard Navigation Links', passed: true });
  } catch (err: any) {
    subtests.push({ name: 'Dashboard Navigation Links', passed: false, error: err.message });
  }

  // Subtest 3: Router table matches routes
  try {
    assert.ok(router, 'Router instance must be exported');
    if (typeof router.navigate === 'function') {
      await router.navigate('/');
      await flushReactivity();
      assert.equal(router.currentPath?.value || router.pathname?.value || '/', '/');

      await router.navigate('/settings');
      await flushReactivity();
      assert.equal(router.currentPath?.value || router.pathname?.value || '/settings', '/settings');
    }
    subtests.push({ name: 'Router Navigation Routing Table', passed: true });
  } catch (err: any) {
    subtests.push({ name: 'Router Navigation Routing Table', passed: false, error: err.message });
  }

  const allPassed = subtests.every(t => t.passed);
  return {
    passed: allPassed,
    message: allPassed ? 'All routing tests passed' : 'Some routing tests failed',
    subtests
  };
}
