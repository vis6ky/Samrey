import { test, describe } from 'node:test';
import assert from 'node:assert';
import { computeIsDev, isDev } from '../packages/runtime/src/diagnostics.js';

describe('Phase 5 - isDev Resolution Order & Invariants', () => {
  test('with mocked import.meta.env.DEV = true, isDev is true', () => {
    const dev = computeIsDev({ DEV: true });
    assert.strictEqual(dev, true);
  });

  test('with mocked import.meta.env.DEV = false (even if process.env.NODE_ENV is development), isDev is false', () => {
    const dev = computeIsDev({ DEV: false }, { env: { NODE_ENV: 'development' } });
    assert.strictEqual(dev, false, 'import.meta.env.DEV has precedence over process.env.NODE_ENV');
  });

  test('with only process.env.NODE_ENV = "production", isDev is false', () => {
    const dev = computeIsDev(undefined, { env: { NODE_ENV: 'production' } });
    assert.strictEqual(dev, false);
  });

  test('with only process.env.NODE_ENV = "development", isDev is true', () => {
    const dev = computeIsDev(undefined, { env: { NODE_ENV: 'development' } });
    assert.strictEqual(dev, true);
  });

  test('with neither present (no bundler, process is null/undefined) -> must be false', () => {
    const dev = computeIsDev(null as any, null);
    assert.strictEqual(dev, false, 'Unknown environment must default to false (quiet)');
  });

  test('module-level isDev evaluated in current Node test runner environment', () => {
    assert.strictEqual(typeof isDev, 'boolean');
    assert.strictEqual(isDev, process.env.NODE_ENV !== 'production');
  });
});
