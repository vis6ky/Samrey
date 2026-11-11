import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { 
  signal, 
  computed, 
  effect, 
  batch, 
  createOwner,
  runWithOwner,
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
        void `${first.value} ${last.value}`;
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

  it('unsubscribes from stale dependencies when dynamic branches change', () => {
    const cond = signal(true);
    const a = signal(10);
    const b = signal(20);
    let runs = 0;
    let observed = 0;

    createRoot(() => {
      effect(() => {
        runs++;
        observed = cond.value ? a.value : b.value;
      });
    });

    assert.equal(runs, 1);
    assert.equal(observed, 10);

    // Switch branch to b
    cond.value = false;
    assert.equal(runs, 2);
    assert.equal(observed, 20);

    // Mutate a - since a is no longer in active branch, effect should NOT run!
    a.value = 999;
    assert.equal(runs, 2);
    assert.equal(observed, 20);

    // Mutate b - effect MUST run
    b.value = 50;
    assert.equal(runs, 3);
    assert.equal(observed, 50);
  });

  it('does not re-run effect with mixed computed and signal dependencies when computed output is unchanged', () => {
    const rawNumber = signal(4);
    const isEven = computed(() => rawNumber.value % 2 === 0);
    const label = signal('status');
    let effectRuns = 0;

    createRoot(() => {
      effect(() => {
        effectRuns++;
        void `${label.value}: ${isEven.value}`;
      });
    });

    assert.equal(effectRuns, 1);

    // Change rawNumber from 4 to 6: isEven is still true!
    rawNumber.value = 6;
    assert.equal(isEven.value, true);
    // Because label did not change and isEven remained true, effect must NOT re-run!
    assert.equal(effectRuns, 1);

    // Now change rawNumber to 7: isEven changes to false!
    rawNumber.value = 7;
    assert.equal(isEven.value, false);
    assert.equal(effectRuns, 2);
  });

  it('treats NaN to NaN update as unchanged without notifying subscribers', () => {
    const num = signal(NaN);
    let runs = 0;

    createRoot(() => {
      effect(() => {
        runs++;
        void num.value;
      });
    });

    assert.equal(runs, 1);
    num.value = NaN;
    assert.equal(runs, 1); // Must not re-run on NaN -> NaN
  });

  it('prevents infinite effect loops in batch() by enforcing maximum update cycle limit (SAMREY-301)', () => {
    const count = signal(0);

    createRoot(() => {
      effect(() => {
        if (count.value > 0) {
          count.value++;
        }
      });
    });

    assert.throws(
      () => {
        batch(() => {
          count.value = 1;
        });
      },
      (err: any) => {
        assert.ok(err instanceof Error);
        assert.ok(err.message.includes('SAMREY-301'));
        return true;
      }
    );
  });

  it('preserves exact array reference identity and emits a dev warning only on in-place mutation reassignments', () => {
    const rawArr = [1, 2];
    const items = signal<number[]>(rawArr);

    // Exact reference equality preserved (zero Proxy wrapper overhead on read)
    assert.strictEqual(items.value, rawArr);

    const warnings: string[] = [];
    const origWarn = console.warn;
    const origNodeEnv = process.env.NODE_ENV;
    console.warn = (...args: unknown[]) => {
      warnings.push(args.map(String).join(' '));
    };

    try {
      process.env.NODE_ENV = 'development';

      // Valid immutable replacement produces zero warnings
      const nextArr = [...items.value, 3];
      items.value = nextArr;
      assert.equal(warnings.length, 0);
      assert.strictEqual(items.value, nextArr);

      // In-place mutation followed by returning same reference triggers dev warning
      items.update((arr) => {
        arr.push(4);
        return arr;
      });
      assert.equal(warnings.length, 1);
      assert.ok(warnings[0].includes('In-place array mutation detected'));

      // Production mode emits zero warnings
      process.env.NODE_ENV = 'production';
      items.update((arr) => {
        arr.push(5);
        return arr;
      });
      assert.equal(warnings.length, 1);
    } finally {
      console.warn = origWarn;
      if (origNodeEnv === undefined) {
        delete process.env.NODE_ENV;
      } else {
        process.env.NODE_ENV = origNodeEnv;
      }
    }
  });

  it('disposes all nested child owners and effects without skipping every second child', () => {
    const trigger = signal(0);
    const disposedIds: string[] = [];

    const dispose = createRoot((disposeRoot) => {
      effect(() => {
        const run = trigger.value;
        // Create 4 sibling child owners inside the effect
        for (let i = 0; i < 4; i++) {
          const child = createOwner();
          runWithOwner(child, () => {
            onCleanup(() => disposedIds.push(`owner-${run}-${i}`));
          });
        }
        // Also create 4 nested effects inside the outer effect
        for (let i = 0; i < 4; i++) {
          effect(() => {
            void run;
            onCleanup(() => disposedIds.push(`nested-${run}-${i}`));
          });
        }
      });
      return disposeRoot;
    });

    assert.equal(disposedIds.length, 0);

    // Trigger outer effect re-run: all 4 child owners and all 4 nested effects from run 0 must dispose
    trigger.value = 1;
    for (let i = 0; i < 4; i++) {
      assert.ok(disposedIds.includes(`owner-0-${i}`), `missing owner-0-${i}`);
      assert.ok(disposedIds.includes(`nested-0-${i}`), `missing nested-0-${i}`);
    }

    // Dispose root: all 4 child owners and all 4 nested effects from run 1 must dispose
    dispose();
    for (let i = 0; i < 4; i++) {
      assert.ok(disposedIds.includes(`owner-1-${i}`), `missing owner-1-${i}`);
      assert.ok(disposedIds.includes(`nested-1-${i}`), `missing nested-1-${i}`);
    }
  });

  it('detects same-length in-place array mutations in dev mode while keeping zero-copy reference identity', () => {
    const origWarn = console.warn;
    const origNodeEnv = process.env.NODE_ENV;
    const warnings: string[] = [];
    console.warn = (msg: unknown) => {
      warnings.push(String(msg));
    };

    try {
      process.env.NODE_ENV = 'development';
      const rawArr = [3, 1, 2];
      const items = signal(rawArr);
      assert.strictEqual(items.value, rawArr);

      // Same-length index mutation returned as same reference
      items.update((arr) => {
        arr[0] = 99;
        return arr;
      });
      assert.equal(warnings.length, 1);
      assert.ok(warnings[0].includes('In-place array mutation detected'));
      assert.strictEqual(items.value, rawArr);

      // Same-length sort mutation returned as same reference
      items.update((arr) => arr.sort((a, b) => a - b));
      assert.equal(warnings.length, 2);

      // Production mode remains silent
      process.env.NODE_ENV = 'production';
      items.update((arr) => {
        arr[1] = 42;
        return arr;
      });
      assert.equal(warnings.length, 2);
    } finally {
      console.warn = origWarn;
      if (origNodeEnv === undefined) {
        delete process.env.NODE_ENV;
      } else {
        process.env.NODE_ENV = origNodeEnv;
      }
    }
  });
});
