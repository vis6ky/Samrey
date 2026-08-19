import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { renderTest, flushReactivity } from '../src/index.js';
import { signal, onCleanup } from '@aether/reactivity';

describe('@aether/testing', () => {
  it('mounts and disposes test components cleanly', async () => {
    let cleanedUp = false;

    const { container, unmount } = renderTest(() => {
      const s = signal('active');
      onCleanup(() => {
        cleanedUp = true;
      });
      return { text: s.value };
    });

    assert.deepEqual(container, { text: 'active' });
    assert.equal(cleanedUp, false);

    unmount();
    await flushReactivity();
    assert.equal(cleanedUp, true);
  });
});
