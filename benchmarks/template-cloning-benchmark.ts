import { template } from '../packages/runtime/src/index.js';

export function runTemplateBenchmark(clones = 50_000): { durationMs: number; opsPerSec: number } {
  const start = performance.now();
  const tmpl = template('<div class="row"><h3>Title</h3><p>Description</p></div>');

  for (let i = 0; i < clones; i++) {
    const _ = tmpl();
  }

  const durationMs = performance.now() - start;
  const opsPerSec = Math.round((clones / (durationMs / 1000)));

  return { durationMs, opsPerSec };
}

if (typeof process !== 'undefined' && process.argv && process.argv[1]?.includes('template-cloning-benchmark')) {
  console.log('Running Samrey Template Cloning Benchmark (50,000 clones)...');
  const res = runTemplateBenchmark(50_000);
  console.log(`Completed in ${res.durationMs.toFixed(2)}ms (${res.opsPerSec.toLocaleString()} ops/sec)`);
}
