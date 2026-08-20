export interface BenchmarkResult {
  name: string;
  category: string;
  iterations: number;
  warmupIterations: number;
  minMs: number;
  medianMs: number;
  avgMs: number;
  p95Ms: number;
  opsPerSec: number;
  heapDeltaKb?: number;
  details?: Record<string, any>;
}

export interface BenchmarkOptions {
  category?: string;
  warmup?: number;
  iterations?: number;
  trackMemory?: boolean;
  details?: Record<string, any>;
}

function processTimes(times: number[]): { minMs: number; medianMs: number; avgMs: number; p95Ms: number; opsPerSec: number } {
  times.sort((a, b) => a - b);
  let sampledTimes = times;
  if (times.length >= 8) {
    sampledTimes = times.slice(1, times.length - 1);
  }
  const minMs = times[0];
  const medianMs = times[Math.floor(times.length / 2)];
  const avgMs = sampledTimes.reduce((acc, t) => acc + t, 0) / sampledTimes.length;
  const p95Index = Math.min(times.length - 1, Math.floor(times.length * 0.95));
  const p95Ms = times[p95Index];
  const opsPerSec = avgMs > 0 ? Math.round(1000 / avgMs) : 0;

  return {
    minMs: Number(minMs.toFixed(3)),
    medianMs: Number(medianMs.toFixed(3)),
    avgMs: Number(avgMs.toFixed(3)),
    p95Ms: Number(p95Ms.toFixed(3)),
    opsPerSec
  };
}

export function benchmark(
  name: string,
  fn: (iter: number) => void,
  options: BenchmarkOptions = {}
): BenchmarkResult {
  const category = options.category || 'General';
  const warmup = options.warmup ?? 3;
  const iterations = options.iterations ?? 15;
  const trackMemory = options.trackMemory ?? false;

  // Warmup phase
  for (let i = 0; i < warmup; i++) {
    fn(i);
  }

  const times: number[] = [];
  const startMem = trackMemory && typeof process !== 'undefined' ? process.memoryUsage().heapUsed : 0;

  for (let i = 0; i < iterations; i++) {
    const start = performance.now();
    fn(i);
    const end = performance.now();
    times.push(end - start);
  }

  const endMem = trackMemory && typeof process !== 'undefined' ? process.memoryUsage().heapUsed : 0;
  const heapDeltaKb = trackMemory ? Math.round((endMem - startMem) / 1024) : undefined;

  const stats = processTimes(times);

  return {
    name,
    category,
    iterations,
    warmupIterations: warmup,
    ...stats,
    heapDeltaKb,
    details: options.details
  };
}

export async function benchmarkAsync(
  name: string,
  fn: (iter: number) => Promise<void>,
  options: BenchmarkOptions = {}
): Promise<BenchmarkResult> {
  const category = options.category || 'General';
  const warmup = options.warmup ?? 3;
  const iterations = options.iterations ?? 10;
  const trackMemory = options.trackMemory ?? false;

  for (let i = 0; i < warmup; i++) {
    await fn(i);
  }

  const times: number[] = [];
  const startMem = trackMemory && typeof process !== 'undefined' ? process.memoryUsage().heapUsed : 0;

  for (let i = 0; i < iterations; i++) {
    const start = performance.now();
    await fn(i);
    const end = performance.now();
    times.push(end - start);
  }

  const endMem = trackMemory && typeof process !== 'undefined' ? process.memoryUsage().heapUsed : 0;
  const heapDeltaKb = trackMemory ? Math.round((endMem - startMem) / 1024) : undefined;

  const stats = processTimes(times);

  return {
    name,
    category,
    iterations,
    warmupIterations: warmup,
    ...stats,
    heapDeltaKb,
    details: options.details
  };
}

export function formatResultTable(results: BenchmarkResult[]): string {
  const lines: string[] = [];
  lines.push('| Category | Benchmark | Min (ms) | Median (ms) | Avg (ms) | p95 (ms) | Ops/sec | Heap Δ |');
  lines.push('|---|---|---|---|---|---|---|---|');
  for (const r of results) {
    const heapStr = r.heapDeltaKb !== undefined ? `${r.heapDeltaKb} KB` : 'N/A';
    lines.push(`| ${r.category} | ${r.name} | ${r.minMs} | ${r.medianMs} | ${r.avgMs} | ${r.p95Ms} | ${r.opsPerSec.toLocaleString()} | ${heapStr} |`);
  }
  return lines.join('\n');
}
