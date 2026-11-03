import { renderToString, renderToStream } from '../../packages/ssr/src/index.js';
import { serializeStateForHydration, safeJsonParse, stripSecrets } from '../../packages/ssr/src/index.js';
import { getDelegatedEventScript } from '../../packages/ssr/src/index.js';
import { benchmark, benchmarkAsync, BenchmarkResult } from '../utils/harness.js';

function createSSRComponentTree(nodeCount: number) {
  return () => {
    const items = Array.from({ length: nodeCount }, (_, i) => `<li class="ssr-item-${i}"><span>Row #${i}</span><strong>Value: ${i * 2}</strong></li>`).join('\n');
    return `<div class="ssr-app" id="root"><header class="header"><h1>SSR Test</h1></header><main class="main"><ul class="list">${items}</ul></main></div>`;
  };
}

export async function runSSRBenchmarks(): Promise<BenchmarkResult[]> {
  const results: BenchmarkResult[] = [];
  const category = 'SSR & Serialization';

  // 1. renderToString across tree scales (10, 100, 1,000, 5,000)
  for (const count of [10, 100, 1000, 5000]) {
    const component = createSSRComponentTree(count);
    results.push(benchmark(`SSR: renderToString (${count.toLocaleString()} nodes)`, () => {
      renderToString(component, {
        title: 'Benchmark Page',
        state: { user: 'tester', count },
        headTags: '<meta name="viewport" content="width=device-width" />'
      });
    }, { category, iterations: count > 1000 ? 5 : 15, trackMemory: true }));
  }

  // 2. renderToStream streaming benchmarks (100, 1,000 nodes)
  for (const count of [100, 1000]) {
    const component = createSSRComponentTree(count);
    results.push(await benchmarkAsync(`SSR: renderToStream Complete (${count.toLocaleString()} nodes)`, async () => {
      const stream = renderToStream(component, { title: 'Streaming Bench', state: { count } });
      const reader = stream.getReader();
      while (true) {
        const { done } = await reader.read();
        if (done) break;
      }
    }, { category, iterations: count > 100 ? 5 : 10 }));
  }

  // 3. State Serialization & Secret Scrubbing
  const complexState = {
    user: { id: 101, name: 'Alice', apiKey: 'sk-live-secret-key-12345', passwordHash: '$2b$12$e8x...', role: 'admin' },
    auth: { bearer: 'Bearer eyJhbGciOi...', jwtToken: 'token.123.456' },
    data: Array.from({ length: 500 }, (_, i) => ({ id: i, name: `Row ${i}`, secretToken: `tok_${i}` }))
  };

  results.push(benchmark('SSR: Secret Scrubbing (500 items deep scan)', () => {
    stripSecrets(complexState, { onSecretFound: () => {} });
  }, { category, iterations: 20 }));

  results.push(benchmark('SSR: serializeStateForHydration with Unicode & Tag Escaping', () => {
    serializeStateForHydration(complexState, { onSecretFound: () => {} });
  }, { category, iterations: 20 }));

  const rawJsonPayload = JSON.stringify(complexState);
  results.push(benchmark('SSR: safeJsonParse with Prototype Scrubbing', () => {
    safeJsonParse(rawJsonPayload);
  }, { category, iterations: 20 }));

  // 4. Pre-Hydration Event Listener Script Generation
  results.push(benchmark('SSR: getDelegatedEventScript Generation', () => {
    getDelegatedEventScript(['click', 'input', 'keydown', 'submit']);
  }, { category, iterations: 25 }));

  return results;
}
