import * as fs from 'node:fs';
import * as path from 'node:path';

export interface BenchmarkThreshold {
  category: string;
  name: string;
  maxAvgMs?: number;
  minOpsPerSec?: number;
  maxHeapDeltaKb?: number;
  maxRegressionPercent: number;
  rationale: string;
}

export const REGRESSION_THRESHOLDS: BenchmarkThreshold[] = [
  // 1. Compiler Thresholds
  {
    category: 'Compiler',
    name: 'Full Compile: Small (~10 nodes with Show/For)',
    maxRegressionPercent: 35,
    minOpsPerSec: 7000,
    rationale: 'Small templates represent hot inline JSX/AIR compilation in dev mode. Must remain > 7k ops/sec with < 35% jitter.'
  },
  {
    category: 'Compiler',
    name: 'Full Compile: Medium (~100 nodes dynamic/components)',
    maxRegressionPercent: 40,
    minOpsPerSec: 600,
    rationale: 'Standard UI components with nested tags & dynamic bindings. 40% allowance accounts for CI CPU jitter while preventing O(N^2) regressions.'
  },
  {
    category: 'Compiler',
    name: 'Full Compile: Large (~1,000 nodes)',
    maxRegressionPercent: 40,
    minOpsPerSec: 180,
    rationale: 'Large multi-module template parsing must scale linearly in under 6ms.'
  },
  {
    category: 'Compiler',
    name: 'Full Compile: Very Large (~10,000 nodes)',
    maxRegressionPercent: 85,
    minOpsPerSec: 15,
    rationale: 'Stress-test bounds with full AST/AIR control flow parsing. Must stay above 15 ops/sec.'
  },
  {
    category: 'Compiler',
    name: 'Full Compile: Deeply Nested (150 levels)',
    maxRegressionPercent: 40,
    minOpsPerSec: 500,
    rationale: 'Validates recursive stack depth and avoids call-stack degradation.'
  },

  // 2. Reactivity Thresholds
  {
    category: 'Reactivity',
    name: 'Single Signal Update (10,000 mutations)',
    maxRegressionPercent: 35,
    minOpsPerSec: 75,
    rationale: 'Core fine-grained state mutator throughput. High frequency loops must not regress below 75 ops/sec.'
  },
  {
    category: 'Reactivity',
    name: '100 Independent Signals with Effects',
    maxRegressionPercent: 40,
    minOpsPerSec: 800,
    rationale: 'Standard reactive UI component scope. Must execute in ~1ms.'
  },
  {
    category: 'Reactivity',
    name: '10,000 Signals Creation and Propagation',
    maxRegressionPercent: 40,
    minOpsPerSec: 20,
    rationale: 'Massive reactive graph instantiation. Verifies subscriber set efficiency.'
  },
  {
    category: 'Reactivity',
    name: 'Batched Updates (1,000 signals in 1 batch)',
    maxRegressionPercent: 40,
    minOpsPerSec: 180,
    rationale: 'Transactional batch flushing and re-entrant queue draining. Must stay above 180 ops/sec.'
  },
  {
    category: 'Reactivity',
    name: 'Owner Lifecycle (1,000 root owners created & disposed)',
    maxRegressionPercent: 40,
    minOpsPerSec: 65,
    rationale: 'Owner context allocation and cleanup tree disposal. Prevents memory leak and allocation blowup.'
  },

  // 3. Runtime DOM Thresholds
  {
    category: 'Runtime DOM',
    name: 'Initial Mount (100 nodes)',
    maxRegressionPercent: 40,
    minOpsPerSec: 1500,
    rationale: 'Fast DOM template instantiation and clone operations.'
  },
  {
    category: 'Runtime DOM',
    name: 'Initial Mount (1,000 nodes)',
    maxRegressionPercent: 40,
    minOpsPerSec: 500,
    rationale: 'Medium-size page mount. Must complete under 2ms avg.'
  },
  {
    category: 'Runtime DOM',
    name: 'Initial Mount (10,000 nodes)',
    maxRegressionPercent: 45,
    minOpsPerSec: 15,
    rationale: 'Heavy DOM node instantiation stress test.'
  },
  {
    category: 'Runtime DOM',
    name: 'Text Binding Updates (1,000 nodes)',
    maxRegressionPercent: 40,
    minOpsPerSec: 100,
    rationale: 'Text dirty-check and fine-grained DOM mutation.'
  },
  {
    category: 'Runtime DOM',
    name: 'Text Binding Updates (10,000 nodes)',
    maxRegressionPercent: 45,
    minOpsPerSec: 4,
    rationale: 'Massive text node dirty checking. Prevents redundant textContent writes.'
  },
  {
    category: 'Runtime DOM',
    name: 'Attribute Updates (1,000 elements)',
    maxRegressionPercent: 40,
    minOpsPerSec: 120,
    rationale: 'Attribute dirty check and setAttribute bypass.'
  },
  {
    category: 'Runtime DOM',
    name: 'Event Registration & Dispatch (1,000 elements)',
    maxRegressionPercent: 50,
    minOpsPerSec: 1000,
    rationale: 'Delegated event dispatch throughput.'
  },

  // 4. Control Flow Thresholds
  {
    category: 'Control Flow - Show',
    name: 'Show: Single Transition (false -> true)',
    maxRegressionPercent: 35,
    minOpsPerSec: 18000,
    rationale: 'Conditional branch mount time. Must remain ultra-responsive.'
  },
  {
    category: 'Control Flow - Show',
    name: 'Show: Single Transition (true -> false)',
    maxRegressionPercent: 35,
    minOpsPerSec: 25000,
    rationale: 'Conditional unmount & owner disposal time.'
  },
  {
    category: 'Control Flow - Show',
    name: 'Show: Repeated Toggling (100 cycles)',
    maxRegressionPercent: 40,
    minOpsPerSec: 400,
    rationale: 'Rapid toggle churn. Detects memory leaks or dangling event handlers.'
  },
  {
    category: 'Control Flow - For (Keyed)',
    name: 'For: Initial Keyed Mount (1,000 items)',
    maxRegressionPercent: 45,
    minOpsPerSec: 80,
    rationale: 'Keyed list mount and index tracking. 45% margin allows for Node V8 array allocation GC timing while ensuring >= 80 ops/sec.'
  },
  {
    category: 'Control Flow - For (Keyed)',
    name: 'For: Initial Keyed Mount (10,000 items)',
    maxRegressionPercent: 45,
    minOpsPerSec: 4,
    rationale: 'Large virtual/keyed table mount.'
  },
  {
    category: 'Control Flow - For (Keyed)',
    name: 'For: Append 100 items (1,000 base)',
    maxRegressionPercent: 40,
    minOpsPerSec: 50,
    rationale: 'Tail-insert list reconciliation without shifting existing items.'
  },
  {
    category: 'Control Flow - For (Keyed)',
    name: 'For: Prepend 100 items (1,000 base)',
    maxRegressionPercent: 250,
    minOpsPerSec: 25,
    rationale: 'Head-insert list reconciliation index propagation across 1,000 items. Prepend involves index signal triggers which are sensitive to run timing; absolute floor is 25 ops/sec.'
  },
  {
    category: 'Control Flow - For (Keyed)',
    name: 'For: Remove middle 100 items (1,000 base)',
    maxRegressionPercent: 40,
    minOpsPerSec: 70,
    rationale: 'Splice removal & DOM subtree cleanup.'
  },
  {
    category: 'Control Flow - For (Keyed)',
    name: 'For: Verification of 90% Node Reuse (1,000 items, swap 100)',
    maxRegressionPercent: 40,
    minOpsPerSec: 80,
    rationale: 'Validates that keyed diffing reuses 90% of identical DOM nodes rather than remounting.'
  },

  // 5. Components & SSR
  {
    category: 'Components',
    name: 'Component Creation: 1,000 Flat Components',
    maxRegressionPercent: 80,
    minOpsPerSec: 350,
    rationale: 'Component instance lifecycle setup & hook invocation. Sub-millisecond execution scales with environment load, minimum floor is 350 ops/sec.'
  },
  {
    category: 'SSR & Serialization',
    name: 'SSR: renderToString (1,000 nodes)',
    maxRegressionPercent: 35,
    minOpsPerSec: 3000,
    rationale: 'Server-side HTML string generation speed.'
  },
  {
    category: 'SSR & Serialization',
    name: 'SSR: renderToStream Complete (1,000 nodes)',
    maxRegressionPercent: 40,
    minOpsPerSec: 300,
    rationale: 'Streaming SSR chunk delivery speed.'
  },
  {
    category: 'SSR & Serialization',
    name: 'SSR: Secret Scrubbing (500 items deep scan)',
    maxRegressionPercent: 40,
    minOpsPerSec: 450,
    rationale: 'Deep security secret sanitization over SSR hydration payloads.'
  }
];

export function getBaselineData(): Record<string, any> | null {
  const baselinePath = path.join(process.cwd(), 'benchmarks', 'results.json');
  if (!fs.existsSync(baselinePath)) return null;
  try {
    return JSON.parse(fs.readFileSync(baselinePath, 'utf-8'));
  } catch {
    return null;
  }
}
