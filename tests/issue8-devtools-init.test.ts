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
  it('1. Does not install window.__SAMREY_DEVTOOLS_BRIDGE__ on import and emit() does nothing before init', () => {
    // Before calling initDevTools, window property should not exist
    const mockWindow: any = {
      location: { origin: 'http://localhost:3000' },
      postMessage: () => {
        throw new Error('postMessage should not be called before init');
      }
    };
    (globalThis as any).window = mockWindow;

    assert.equal(mockWindow.__SAMREY_DEVTOOLS_BRIDGE__, undefined, 'Must not attach to window on import');

    const heard: any[] = [];
    const unsub = samreyDevToolsBridge.subscribe((e) => heard.push(e));
    samreyDevToolsBridge.emit('lifecycle:mount', { component: 'Uninit' });
    unsub();
    assert.equal(heard.length, 0, 'No events heard before init');
    assert.equal(samreyDevToolsBridge.getEventHistory().length, 0, 'No history before init');
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

  it('3. emit() does nothing after init({isDev: false}) and emits after init({isDev: true})', () => {
    samreyDevToolsBridge.clearHistory();
    const receivedEvents: any[] = [];
    samreyDevToolsBridge.subscribe((ev) => receivedEvents.push(ev));

    let postedMessages: any[] = [];
    (globalThis as any).window = {
      location: { origin: 'http://localhost:3000' },
      postMessage: (msg: any) => postedMessages.push(msg)
    };

    // After initDevTools({ isDev: false }): emit() must do nothing
    initDevTools({ isDev: false });
    samreyDevToolsBridge.emit('lifecycle:mount', { component: 'InactiveComponent' });
    assert.equal(receivedEvents.length, 0, 'No events should be heard after init({isDev: false})');
    assert.equal(samreyDevToolsBridge.getEventHistory().length, 0, 'Event log must be empty after init({isDev: false})');
    assert.equal(postedMessages.length, 0, 'No postMessage after init({isDev: false})');

    // After initDevTools({ isDev: true }): emit() is active
    initDevTools({ isDev: true });
    samreyDevToolsBridge.emit('lifecycle:mount', { component: 'ActiveComponent' });
    assert.equal(receivedEvents.length, 1, 'Event must be heard after init({isDev: true})');
    assert.equal(receivedEvents[0].payload.component, 'ActiveComponent');
    assert.equal(samreyDevToolsBridge.getEventHistory().length, 1);
    assert.equal(postedMessages.length, 1);
  });
});
