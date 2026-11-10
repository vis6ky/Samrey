/**
 * @license Apache-2.0
 * Samrey 2.1.0 — Template References Performance & Overhead Benchmark
 */

import { template } from '../packages/runtime/src/index.js';
import { createRoot } from '@samrey/reactivity';

export interface BenchmarkResult {
  category: string;
  operations: number;
  durationMs: number;
  opsPerSec: number;
}

export function runTemplateRefsBenchmark(): BenchmarkResult[] {
  const results: BenchmarkResult[] = [];
  const CLONES = 50_000;
  const ACCESSES = 1_000_000;

  // 1. Template cloning without references (Baseline)
  {
    const tmplPlain = template('<div class="row"><h3>Title</h3><p>Description</p></div>');
    // Warmup
    for (let i = 0; i < 1_000; i++) tmplPlain();

    const start = performance.now();
    for (let i = 0; i < CLONES; i++) {
      tmplPlain();
    }
    const durationMs = performance.now() - start;
    results.push({
      category: '1. Template cloning without references (Baseline)',
      operations: CLONES,
      durationMs,
      opsPerSec: Math.round(CLONES / (durationMs / 1000))
    });
  }

  // 2. Template cloning with references
  {
    const tmplRefs = template('<div class="row"><h3 ref="title">Title</h3><p ref="desc">Description</p></div>');
    // Warmup
    for (let i = 0; i < 1_000; i++) tmplRefs.clone();

    const start = performance.now();
    for (let i = 0; i < CLONES; i++) {
      tmplRefs.clone();
    }
    const durationMs = performance.now() - start;
    results.push({
      category: '2. Template cloning with references (root.refs)',
      operations: CLONES,
      durationMs,
      opsPerSec: Math.round(CLONES / (durationMs / 1000))
    });
  }

  // 3. Access through root.refs
  {
    const tmpl = template('<div class="card"><h3 ref="heading">Heading</h3><p ref="body">Body</p><button ref="action">Btn</button></div>');
    const root = tmpl.clone();

    // Warmup
    for (let i = 0; i < 10_000; i++) {
      const _ = root.refs.heading;
    }

    const start = performance.now();
    for (let i = 0; i < ACCESSES; i++) {
      const _h = root.refs.heading;
      const _b = root.refs.body;
      const _a = root.refs.action;
    }
    const durationMs = performance.now() - start;
    results.push({
      category: '3. Direct reference access (root.refs.property)',
      operations: ACCESSES * 3,
      durationMs,
      opsPerSec: Math.round((ACCESSES * 3) / (durationMs / 1000))
    });
  }

  // 4. Dynamic access through root.ref()
  {
    const tmpl = template('<div class="card"><h3 ref="heading">Heading</h3><p ref="body">Body</p><button ref="action">Btn</button></div>');
    const root = tmpl.clone();

    // Warmup
    for (let i = 0; i < 10_000; i++) {
      const _ = root.ref('heading');
    }

    const start = performance.now();
    for (let i = 0; i < ACCESSES; i++) {
      const _h = root.ref('heading');
      const _b = root.ref('body');
      const _a = root.ref('action');
    }
    const durationMs = performance.now() - start;
    results.push({
      category: '4. Dynamic reference lookup (root.ref(name))',
      operations: ACCESSES * 3,
      durationMs,
      opsPerSec: Math.round((ACCESSES * 3) / (durationMs / 1000))
    });
  }

  // 5. Multiple clones with disposal
  {
    const tmpl = template('<form ref="form"><input ref="input" /><button ref="submit">Go</button></form>');
    const start = performance.now();
    for (let i = 0; i < CLONES; i++) {
      createRoot((dispose) => {
        const root = tmpl.clone();
        const _ = root.refs.input;
        dispose();
      });
    }
    const durationMs = performance.now() - start;
    results.push({
      category: '5. Clone, reference access & reactive disposal cycle',
      operations: CLONES,
      durationMs,
      opsPerSec: Math.round(CLONES / (durationMs / 1000))
    });
  }

  return results;
}

if (typeof process !== 'undefined' && process.argv && process.argv[1]?.includes('template-refs-benchmark')) {
  console.log('\n================================================================');
  console.log('   Samrey 2.1.0 — Template References Performance Benchmark     ');
  console.log('================================================================\n');

  const beforeMemory = process.memoryUsage().heapUsed;
  const res = runTemplateRefsBenchmark();
  const afterMemory = process.memoryUsage().heapUsed;

  for (const r of res) {
    console.log(`▶ ${r.category}`);
    console.log(`  Ops/sec:   ${r.opsPerSec.toLocaleString()} ops/sec`);
    console.log(`  Duration:  ${r.durationMs.toFixed(2)} ms (${r.operations.toLocaleString()} ops)\n`);
  }

  const memoryDeltaMb = (afterMemory - beforeMemory) / (1024 * 1024);
  console.log(`Heap Delta across all runs: ${memoryDeltaMb.toFixed(2)} MB`);
  console.log('================================================================\n');
}

