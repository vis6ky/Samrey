import { signal, computed, effect, batch, createRoot } from '../packages/reactivity/src/index.js';

export function runReactivityBenchmark(iterations = 100_000): { durationMs: number; opsPerSec: number } {
  const start = performance.now();

  createRoot(() => {
    const a = signal(0);
    const b = computed(() => a.value * 2);
    const c = computed(() => b.value + 1);

    let observed = 0;
    effect(() => {
      observed = c.value;
    });

    for (let i = 0; i < iterations; i++) {
      a.value = i;
    }
  });

  const durationMs = performance.now() - start;
  const opsPerSec = Math.round((iterations / (durationMs / 1000)));

  return { durationMs, opsPerSec };
}

if (typeof process !== 'undefined' && process.argv && process.argv[1]?.includes('reactivity-benchmark')) {
  console.log('Running Gati Reactivity Benchmark (100,000 iterations)...');
  const res = runReactivityBenchmark(100_000);
  console.log(`Completed in ${res.durationMs.toFixed(2)}ms (${res.opsPerSec.toLocaleString()} ops/sec)`);
}
