/**
 * @license Apache-2.0
 * Tests for Issue 8: DevTools bridge initialization and isDev gating
 */

import { describe, it } from 'node:test';
import * as assert from 'node:assert/strict';
import {
  samreyDevToolsBridge,
  initDevTools,
  isDevToolsActive,
  computeIsDev
} from '../packages/devtools/src/index.js';

describe('Issue 8: DevTools Bridge Explicit Initialization & isDev Guard', () => {
  it('1. Does not install window.__SAMREY_DEVTOOLS_BRIDGE__ on import', () => {
    // Before calling initDevTools, window property should not exist if mock window is present
    const mockWindow: any = {};
    (globalThis as any).window = mockWindow;

    assert.equal(mockWindow.__SAMREY_DEVTOOLS_BRIDGE__, undefined, 'Must not attach to window on import');
  });

  it('2. Active only outside production and adheres to computeIsDev resolution', () => {
    // In production, initDevTools does not activate devtools or attach bridge to window
    const prodWindow: any = { location: { origin: 'http://localhost:3000' } };
    (globalThis as any).window = prodWindow;

    initDevTools({ isDev: false });
    assert.equal(isDevToolsActive(), false, 'Must be inactive in production');
    assert.equal(prodWindow.__SAMREY_DEVTOOLS_BRIDGE__, undefined, 'Must not attach to window in production');

    // In dev, initDevTools activates and attaches bridge
    initDevTools({ isDev: true });
    assert.equal(isDevToolsActive(), true, 'Must be active when isDev is true');
    assert.equal(prodWindow.__SAMREY_DEVTOOLS_BRIDGE__, samreyDevToolsBridge, 'Must attach bridge to window in dev');

    // Test computeIsDev resolution hierarchy
    assert.equal(computeIsDev({ DEV: true }, { env: { NODE_ENV: 'production' } }), true, 'import.meta.env.DEV wins');
    assert.equal(computeIsDev({ DEV: false }, { env: { NODE_ENV: 'development' } }), false, 'import.meta.env.DEV false wins');
    assert.equal(computeIsDev(undefined, { env: { NODE_ENV: 'development' } }), true, 'process.env fallback works');
    assert.equal(computeIsDev(undefined, null), false, 'unknown environment defaults to false');
  });
});
