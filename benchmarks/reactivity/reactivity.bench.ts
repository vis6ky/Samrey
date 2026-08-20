import { signal, computed, effect, batch, createRoot } from '../../packages/reactivity/src/index.js';
import { benchmark, BenchmarkResult } from '../utils/harness.js';

export function runReactivityBenchmarks(): BenchmarkResult[] {
  const results: BenchmarkResult[] = [];
  const category = 'Reactivity';

  // 1. Single Signal Update (10,000 writes)
  results.push(benchmark('Single Signal Update (10,000 mutations)', () => {
    createRoot((dispose) => {
      const s = signal(0);
      let observed = 0;
      effect(() => {
        observed = s.value;
      });
      for (let i = 0; i < 10_000; i++) {
        s.value = i;
      }
      dispose();
    });
  }, { category, iterations: 20, trackMemory: true }));

  // 2. 100 Signals Independent Mutations
  results.push(benchmark('100 Independent Signals with Effects', () => {
    createRoot((dispose) => {
      const signals = Array.from({ length: 100 }, (_, i) => signal(i));
      let sum = 0;
      for (const s of signals) {
        effect(() => {
          sum += s.value;
        });
      }
      for (const s of signals) {
        s.value += 1;
      }
      dispose();
    });
  }, { category, iterations: 20 }));

  // 3. 1,000 Signals Independent Mutations
  results.push(benchmark('1,000 Independent Signals with Effects', () => {
    createRoot((dispose) => {
      const signals = Array.from({ length: 1000 }, (_, i) => signal(i));
      let sum = 0;
      for (const s of signals) {
        effect(() => {
          sum += s.value;
        });
      }
      for (let i = 0; i < 1000; i += 2) {
        signals[i].value += 1;
      }
      dispose();
    });
  }, { category, iterations: 10 }));

  // 4. 10,000 Signals Allocation & Reads
  results.push(benchmark('10,000 Signals Creation and Propagation', () => {
    createRoot((dispose) => {
      const signals = Array.from({ length: 10_000 }, (_, i) => signal(i));
      let count = 0;
      for (let i = 0; i < 10_000; i += 10) {
        signals[i].value += 5;
        count += signals[i].value;
      }
      dispose();
    });
  }, { category, iterations: 10, trackMemory: true }));

  // 5. Computed Chain (depth 50)
  results.push(benchmark('Computed Chain (50 nodes deep)', () => {
    createRoot((dispose) => {
      const root = signal(1);
      let current = root as any;
      for (let i = 0; i < 50; i++) {
        const prev = current;
        current = computed(() => prev.value + 1);
      }
      let observed = 0;
      effect(() => {
        observed = current.value;
      });

      for (let i = 0; i < 500; i++) {
        root.value = i;
      }
      dispose();
    });
  }, { category, iterations: 15 }));

  // 6. Diamond Dependency Graph (1 source -> 20 branches -> 1 target)
  results.push(benchmark('Diamond Dependency Graph (1 to 20 to 1)', () => {
    createRoot((dispose) => {
      const source = signal(1);
      const branches = Array.from({ length: 20 }, (_, idx) => computed(() => source.value * (idx + 1)));
      const combined = computed(() => branches.reduce((acc, b) => acc + b.value, 0));

      let observed = 0;
      effect(() => {
        observed = combined.value;
      });

      for (let i = 0; i < 500; i++) {
        source.value = i;
      }
      dispose();
    });
  }, { category, iterations: 20 }));

  // 7. Nested Effects (depth 4)
  results.push(benchmark('Nested Effects (4 levels deep)', () => {
    createRoot((dispose) => {
      const s1 = signal(0);
      const s2 = signal(0);
      const s3 = signal(0);
      const s4 = signal(0);

      effect(() => {
        const v1 = s1.value;
        effect(() => {
          const v2 = s2.value;
          effect(() => {
            const v3 = s3.value;
            effect(() => {
              const v4 = s4.value + v1 + v2 + v3;
            });
          });
        });
      });

      for (let i = 0; i < 50; i++) {
        s4.value = i;
      }
      dispose();
    });
  }, { category, iterations: 20 }));

  // 8. Batched Signal Updates (1,000 mutations in 1 batch)
  results.push(benchmark('Batched Updates (1,000 signals in 1 batch)', () => {
    createRoot((dispose) => {
      const signals = Array.from({ length: 1000 }, (_, i) => signal(i));
      let effectRuns = 0;
      const combined = computed(() => signals.reduce((sum, s) => sum + s.value, 0));
      effect(() => {
        const _ = combined.value;
        effectRuns++;
      });

      batch(() => {
        for (let i = 0; i < 1000; i++) {
          signals[i].value += 1;
        }
      });
      dispose();
    });
  }, { category, iterations: 15 }));

  // 9. Owner Creation & Disposal (1,000 owners)
  results.push(benchmark('Owner Lifecycle (1,000 root owners created & disposed)', () => {
    for (let i = 0; i < 1000; i++) {
      createRoot((dispose) => {
        const s = signal(i);
        const c = computed(() => s.value * 2);
        effect(() => {
          const _ = c.value;
        });
        dispose();
      });
    }
  }, { category, iterations: 15, trackMemory: true }));

  return results;
}
