import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { aetherDevToolsBridge, defaultGraphInspector, DevToolsEvent } from '../src/index.js';

describe('@aether/devtools', () => {
  it('emits and captures bridge events', () => {
    const captured: DevToolsEvent[] = [];
    const unsubscribe = aetherDevToolsBridge.subscribe((ev) => captured.push(ev));

    aetherDevToolsBridge.emit('node:created', { id: 'sig-1', value: 10 });
    assert.equal(captured.length, 1);
    assert.equal(captured[0]?.type, 'node:created');

    unsubscribe();
    aetherDevToolsBridge.emit('node:updated', { id: 'sig-1', value: 20 });
    assert.equal(captured.length, 1); // Unsubscribed
  });

  it('tracks and snapshots reactive nodes', () => {
    defaultGraphInspector.clear();
    defaultGraphInspector.registerNode({
      id: 'signal_user_count',
      name: 'userCount',
      value: 42,
      subscribersCount: 3
    });

    const snapshot = defaultGraphInspector.getSnapshot();
    assert.equal(snapshot.length, 1);
    assert.equal(snapshot[0]?.name, 'userCount');
  });
});
