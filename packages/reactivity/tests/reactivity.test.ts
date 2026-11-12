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
  onError,
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

  it('skips downstream computed re-evaluation when upstream computed outputs remain equal', () => {
    const raw = signal(1);
    let clampedEvals = 0;
    let downstreamEvals = 0;
    let effectRuns = 0;

    const clamped = computed(() => {
      clampedEvals++;
      return Math.max(raw.value, 5);
    });
    const doubled = computed(() => {
      downstreamEvals++;
      return clamped.value * 2;
    });

    createRoot(() => {
      effect(() => {
        effectRuns++;
        void doubled.value;
      });
    });

    assert.equal(doubled.value, 10);
    assert.equal(clampedEvals, 1);
    assert.equal(downstreamEvals, 1);
    assert.equal(effectRuns, 1);

    // raw 1 -> 2 still clamps to 5: clamped re-evaluates, but doubled and effect must NOT re-run
    raw.value = 2;
    assert.equal(doubled.value, 10);
    assert.equal(clampedEvals, 2);
    assert.equal(downstreamEvals, 1);
    assert.equal(effectRuns, 1);

    // raw 2 -> 7 changes clamped to 7: doubled and effect must re-run once
    raw.value = 7;
    assert.equal(doubled.value, 14);
    assert.equal(clampedEvals, 3);
    assert.equal(downstreamEvals, 2);
    assert.equal(effectRuns, 2);
  });

  it('Batch 2 regression: recovers computed from thrown error without sticky isDirty deadlock, prevents zombie resurrection on disposal, and routes effect/batch errors to onError', () => {
    // 1. Direct computed throw recovery
    const num = signal(2);
    const derived = computed(() => {
      const v = num.value;
      if (v < 0) throw new Error('negative');
      return v * 10;
    });

    assert.equal(derived.value, 20);
    num.value = -1;
    assert.throws(() => derived.value, /negative/);
    assert.throws(() => derived.value, /negative/);
    num.value = 3;
    assert.equal(derived.value, 30, 'computed must recover cleanly after source updates past thrown error');

    // 2. Effect + computed + batch + onError recovery (outside createRoot trigger)
    const shouldThrow = signal(false);
    const safeVal = signal(1);
    const checked = computed(() => {
      if (shouldThrow.value) throw new Error('boom-computed');
      return safeVal.value * 5;
    });
    const caughtErrors: string[] = [];
    const seen: number[] = [];

    createRoot(() => {
      onError((err) => {
        caughtErrors.push(err instanceof Error ? err.message : String(err));
      });
      effect(() => {
        seen.push(checked.value);
      });
    });

    assert.deepEqual(seen, [5]);
    assert.deepEqual(caughtErrors, []);

    // Trigger throwing computed via batch() outside createRoot
    batch(() => {
      shouldThrow.value = true;
    });
    assert.deepEqual(caughtErrors, ['boom-computed'], 'onError in effect owner must catch computed error inside batch()');

    // Recover and ensure effect is NOT stuck with isDirty=true deadlock
    batch(() => {
      shouldThrow.value = false;
      safeVal.value = 4;
    });
    assert.deepEqual(seen, [5, 20], 'Effect and computed must recover and re-run after error');

    // 3. No zombie computed or effect resurrection after disposal
    let compEvals = 0;
    let effectEvals = 0;
    const zSrc = signal(1);
    let leakedComputed!: () => number;

    const disposeZombie = createRoot((dispose) => {
      leakedComputed = computed(() => {
        compEvals++;
        return zSrc.value * 2;
      });
      effect(() => {
        effectEvals++;
        if (zSrc.value > 1) {
          dispose();
          void zSrc.value;
        }
      });
      assert.equal(leakedComputed(), 2);
      return dispose;
    });

    assert.equal(compEvals, 1);
    assert.equal(effectEvals, 1);

    // Trigger self/owner disposal mid-effect
    zSrc.value = 2;
    assert.equal(effectEvals, 2);

    // Mutate after disposal and read leaked computed: neither may re-evaluate or re-subscribe
    disposeZombie();
    zSrc.value = 10;
    void leakedComputed();
    zSrc.value = 20;
    assert.equal(compEvals, 1, 'Disposed computed must not re-evaluate or resurrect on read/update');
    assert.equal(effectEvals, 2, 'Disposed effect must not re-subscribe or re-run');
  });
});
