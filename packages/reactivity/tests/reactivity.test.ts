import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { 
  signal, 
  computed, 
  effect, 
  batch, 
  untrack, 
  createRoot, 
  onCleanup,
  createStore
} from '../src/index.js';

describe('@samrey/reactivity', () => {
  it('updates signals and notifies computed values', () => {
    const count = signal(0);
    const double = computed(() => count.value * 2);

    assert.equal(count.value, 0);
    assert.equal(double.value, 0);

    count.value = 5;
    assert.equal(count.value, 5);
    assert.equal(double.value, 10);
  });

  it('resolves diamond dependency graphs without glitch or duplicate evaluations', () => {
    //  Signal A
    //   /    \
    // Comp B  Comp C
    //   \    /
    //  Effect D
    const a = signal(1);
    const b = computed(() => a.value * 2);
    const c = computed(() => a.value + 10);

    let effectEvalCount = 0;
    let finalValue = 0;

    createRoot(() => {
      effect(() => {
        effectEvalCount++;
        finalValue = b.value + c.value;
      });
    });

    assert.equal(effectEvalCount, 1);
    assert.equal(finalValue, 13); // (1*2) + (1+10) = 2 + 11 = 13

    // Update A -> both B and C become dirty, but effect should run only ONCE
    a.value = 2;
    assert.equal(effectEvalCount, 2);
    assert.equal(finalValue, 16); // (2*2) + (2+10) = 4 + 12 = 16
  });

  it('batches multiple signal mutations atomically', () => {
    const first = signal('John');
    const last = signal('Doe');
    let runs = 0;

    createRoot(() => {
      effect(() => {
        runs++;
        // Read both
        const _ = `${first.value} ${last.value}`;
      });
    });

    assert.equal(runs, 1);

    batch(() => {
      first.value = 'Jane';
      last.value = 'Smith';
    });

    assert.equal(runs, 2); // Ran only once for both mutations
  });

  it('cleans up reactive scopes correctly', () => {
    let cleanedUp = false;

    const dispose = createRoot((disposeRoot) => {
      onCleanup(() => {
        cleanedUp = true;
      });
      return disposeRoot;
    });

    assert.equal(cleanedUp, false);
    dispose();
    assert.equal(cleanedUp, true);
  });

  it('guards store against prototype pollution attacks', () => {
    const store = createStore<{ name: string; isAdmin?: boolean }>({ name: 'User' });
    
    // Attempt prototype pollution
    (store as unknown as Record<string, unknown>)['__proto__'] = { isAdmin: true };

    assert.equal(store.name, 'User');
    assert.equal(store.isAdmin, undefined);
    assert.equal(({} as Record<string, unknown>)['isAdmin'], undefined);
  });
});
