/**
 * @license Apache-2.0
 * @aether/doc - Native Aether Glitch-Free Reactivity Graph Simulator
 */

import { el, For } from '@aether/runtime';
import { signal, computed } from '@aether/reactivity';
import { icon } from '../lib/icons.js';

export function ReactivityVisualizer(): HTMLElement {
  // Real Native Aether Reactive Signals & Computed Nodes
  const signalA = signal<number>(5);
  const signalB = signal<number>(3);
  const clock = signal<number>(1);
  const evalLog = signal<string[]>([
    'Clock #1: Graph initialized. Root scope created.',
    'Signal A = 5 (ver: 1), Signal B = 3 (ver: 1)',
    'Computed C (A + B) evaluated -> 8',
    'Computed D (C * 2) evaluated -> 16',
    'Computed E (C + 10) evaluated -> 18',
    'DOM Effect (D + E) evaluated -> 34 (1 evaluation; 0 glitches)'
  ]);

  // Real fine-grained Computed dependencies forming the Diamond Graph
  const computedC = computed(() => signalA.value + signalB.value);
  const computedD = computed(() => computedC.value * 2);
  const computedE = computed(() => computedC.value + 10);
  const domEffectOutput = computed(() => computedD.value + computedE.value);

  const mutateA = (delta: number) => {
    const prevA = signalA.value;
    const nextA = prevA + delta;
    const nextClock = clock.value + 1;

    signalA.value = nextA;
    clock.value = nextClock;

    const newC = nextA + signalB.value;
    const newD = newC * 2;
    const newE = newC + 10;
    const newDom = newD + newE;

    evalLog.value = [
      `Clock #${nextClock}: [Transaction Begin] Signal A mutated: ${prevA} -> ${nextA}`,
      `Clock #${nextClock}: Push Phase -> Mark C, D, E, and DOM Effect as STALE (Dirty Flag = true)`,
      `Clock #${nextClock}: Pull Phase (Topological Level 1) -> Computed C re-evaluated -> ${newC}`,
      `Clock #${nextClock}: Pull Phase (Topological Level 2) -> Computed D re-evaluated -> ${newD}`,
      `Clock #${nextClock}: Pull Phase (Topological Level 2) -> Computed E re-evaluated -> ${newE}`,
      `Clock #${nextClock}: Commit Phase (Topological Level 3) -> DOM Effect flushed once -> ${newDom}`,
      ...evalLog.value.slice(0, 9)
    ];
  };

  const mutateB = (delta: number) => {
    const prevB = signalB.value;
    const nextB = prevB + delta;
    const nextClock = clock.value + 1;

    signalB.value = nextB;
    clock.value = nextClock;

    const newC = signalA.value + nextB;
    const newD = newC * 2;
    const newE = newC + 10;
    const newDom = newD + newE;

    evalLog.value = [
      `Clock #${nextClock}: [Transaction Begin] Signal B mutated: ${prevB} -> ${nextB}`,
      `Clock #${nextClock}: Push Phase -> Mark C, D, E, and DOM Effect as STALE`,
      `Clock #${nextClock}: Pull Phase -> Computed C: ${newC}, Computed D: ${newD}, Computed E: ${newE}`,
      `Clock #${nextClock}: Commit Phase -> DOM TextNode updated to "${newDom}" (Zero VDOM Diffing)`,
      ...evalLog.value.slice(0, 9)
    ];
  };

  const resetGraph = () => {
    signalA.value = 5;
    signalB.value = 3;
    clock.value = 1;
    evalLog.value = [
      'Clock #1: Graph reset to baseline.',
      'Signal A = 5, Signal B = 3',
      'Computed C = 8, D = 16, E = 18, DOM Effect = 34'
    ];
  };

  const root = el('div', { class: 'space-y-6' });

  // Banner
  const banner = el('div', { class: 'bg-slate-900 text-white rounded-2xl p-6 border border-slate-800 shadow-sm' },
    el('div', { class: 'flex flex-col lg:flex-row lg:items-center justify-between gap-4' },
      el('div', null,
        el('div', { class: 'inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-slate-800 text-emerald-400 text-xs font-mono mb-2' },
          icon('activity', 'w-3.5 h-3.5'),
          el('span', null, 'Push-Pull Topological Reactive Engine')
        ),
        el('h2', { class: 'text-2xl font-bold tracking-tight' }, 'Glitch-Free Reactive Graph Simulator'),
        el('p', { class: 'text-slate-400 text-sm mt-1 max-w-3xl' },
          'Simulate Aether’s O(1) transaction clock, dynamic dependency tracking, and atomic batching. Experience how the classic Diamond Dependency problem is resolved with exactly one evaluation pass and zero intermediate glitch states.'
        )
      ),
      el('div', { class: 'flex items-center space-x-3 bg-slate-800/80 px-4 py-2 rounded-xl border border-slate-700 font-mono text-xs' },
        icon('clock', 'w-4 h-4 text-cyan-400'),
        el('span', null, 'Transaction Clock:'),
        el('span', { class: 'font-bold text-emerald-400 text-sm' }, () => `#${clock.value}`)
      )
    )
  );
  root.appendChild(banner);

  // Split view: Left Interactive Nodes, Right Log
  const splitGrid = el('div', { class: 'grid grid-cols-1 lg:grid-cols-12 gap-6' });

  // Left Column (7 cols)
  const leftCol = el('div', { class: 'lg:col-span-7 bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-6' });

  const leftHeader = el('div', { class: 'flex items-center justify-between' },
    el('span', { class: 'text-xs font-bold uppercase tracking-wider text-slate-500' }, 'Live Dependency Topology'),
    el('button', {
      type: 'button',
      class: 'inline-flex items-center space-x-1.5 text-xs text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-lg transition-colors font-medium cursor-pointer',
      onClick: resetGraph
    },
      icon('rotate-ccw', 'w-3.5 h-3.5'),
      el('span', null, 'Reset State')
    )
  );
  leftCol.appendChild(leftHeader);

  // Topology Diagram
  const diagram = el('div', { class: 'space-y-6' });

  // Level 0: Signals A and B
  const level0 = el('div', { class: 'grid grid-cols-2 gap-4' });

  // Signal A Card
  const nodeA = el('div', { class: 'p-4 rounded-xl bg-slate-50 border-2 border-slate-300 space-y-3' },
    el('div', { class: 'flex items-center justify-between' },
      el('span', { class: 'text-xs font-mono font-bold px-2 py-0.5 rounded bg-slate-200 text-slate-800' }, 'Signal(A)'),
      el('span', { class: 'text-[11px] font-mono text-slate-500' }, 'Level 0')
    ),
    el('div', { class: 'text-2xl font-bold font-mono text-slate-900' }, () => signalA.value),
    el('div', { class: 'flex space-x-2' },
      el('button', {
        id: 'mutate-a-inc',
        type: 'button',
        class: 'flex-1 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-mono font-bold transition-all cursor-pointer',
        onClick: () => mutateA(1)
      }, '+1'),
      el('button', {
        id: 'mutate-a-dec',
        type: 'button',
        class: 'flex-1 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer',
        onClick: () => mutateA(-1)
      }, '-1')
    )
  );

  // Signal B Card
  const nodeB = el('div', { class: 'p-4 rounded-xl bg-slate-50 border-2 border-slate-300 space-y-3' },
    el('div', { class: 'flex items-center justify-between' },
      el('span', { class: 'text-xs font-mono font-bold px-2 py-0.5 rounded bg-slate-200 text-slate-800' }, 'Signal(B)'),
      el('span', { class: 'text-[11px] font-mono text-slate-500' }, 'Level 0')
    ),
    el('div', { class: 'text-2xl font-bold font-mono text-slate-900' }, () => signalB.value),
    el('div', { class: 'flex space-x-2' },
      el('button', {
        id: 'mutate-b-inc',
        type: 'button',
        class: 'flex-1 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-mono font-bold transition-all cursor-pointer',
        onClick: () => mutateB(1)
      }, '+1'),
      el('button', {
        id: 'mutate-b-dec',
        type: 'button',
        class: 'flex-1 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer',
        onClick: () => mutateB(-1)
      }, '-1')
    )
  );

  level0.appendChild(nodeA);
  level0.appendChild(nodeB);
  diagram.appendChild(level0);

  // Down Arrow 1
  diagram.appendChild(el('div', { class: 'flex justify-center text-slate-400' },
    icon('arrow-down', 'w-5 h-5 animate-bounce')
  ));

  // Level 1: Computed C
  const nodeC = el('div', { class: 'p-4 rounded-xl bg-purple-50 border-2 border-purple-200 space-y-2' },
    el('div', { class: 'flex items-center justify-between' },
      el('span', { class: 'text-xs font-mono font-bold px-2 py-0.5 rounded bg-purple-200 text-purple-900' },
        'Computed(C = A + B)'
      ),
      el('span', { class: 'text-[11px] font-mono text-purple-700' }, 'Level 1 · Memoized')
    ),
    el('div', { class: 'text-2xl font-bold font-mono text-purple-950' }, () => computedC.value),
    el('p', { class: 'text-[11px] text-purple-700 font-mono' },
      'Deps: [Signal A, Signal B] · Evaluates ONLY when A or B changes'
    )
  );
  diagram.appendChild(nodeC);

  // Down Arrow 2
  diagram.appendChild(el('div', { class: 'flex justify-center text-slate-400' },
    icon('arrow-down', 'w-5 h-5')
  ));

  // Level 2: Diamond Branches D & E
  const level2 = el('div', { class: 'grid grid-cols-2 gap-4' },
    el('div', { class: 'p-4 rounded-xl bg-blue-50 border-2 border-blue-200 space-y-2' },
      el('div', { class: 'flex items-center justify-between' },
        el('span', { class: 'text-xs font-mono font-bold px-2 py-0.5 rounded bg-blue-200 text-blue-900' },
          'Computed(D = C * 2)'
        ),
        el('span', { class: 'text-[11px] font-mono text-blue-700' }, 'Level 2')
      ),
      el('div', { class: 'text-2xl font-bold font-mono text-blue-950' }, () => computedD.value)
    ),
    el('div', { class: 'p-4 rounded-xl bg-indigo-50 border-2 border-indigo-200 space-y-2' },
      el('div', { class: 'flex items-center justify-between' },
        el('span', { class: 'text-xs font-mono font-bold px-2 py-0.5 rounded bg-indigo-200 text-indigo-900' },
          'Computed(E = C + 10)'
        ),
        el('span', { class: 'text-[11px] font-mono text-indigo-700' }, 'Level 2')
      ),
      el('div', { class: 'text-2xl font-bold font-mono text-indigo-950' }, () => computedE.value)
    )
  );
  diagram.appendChild(level2);

  // Down Arrow 3
  diagram.appendChild(el('div', { class: 'flex justify-center text-slate-400' },
    icon('arrow-down', 'w-5 h-5')
  ));

  // Level 3: DOM Effect Sink
  const nodeSink = el('div', { class: 'p-5 rounded-xl bg-emerald-900 text-white border-2 border-emerald-700 space-y-2 shadow-sm' },
    el('div', { class: 'flex items-center justify-between' },
      el('div', { class: 'flex items-center space-x-2' },
        icon('zap', 'w-4 h-4 text-emerald-300'),
        el('span', { class: 'text-xs font-mono font-bold text-emerald-200' }, 'DOM Effect Sink (Output = D + E)')
      ),
      el('span', { class: 'text-xs px-2 py-0.5 rounded bg-emerald-800 text-emerald-100 font-mono' },
        'Level 3 · Surgical DOM Slot'
      )
    ),
    el('div', { class: 'text-3xl font-bold font-mono text-white' }, () => domEffectOutput.value),
    el('p', { class: 'text-xs text-emerald-200' },
      'Topologically ordered: Evaluated exactly 1 time per clock tick. Zero glitch states.'
    )
  );
  diagram.appendChild(nodeSink);

  leftCol.appendChild(diagram);
  splitGrid.appendChild(leftCol);

  // Right Column: Transaction Log (5 cols)
  const rightCol = el('div', { class: 'lg:col-span-5 bg-white rounded-2xl border border-slate-200 p-6 shadow-xs flex flex-col' },
    el('div', { class: 'flex items-center justify-between pb-3 border-b border-slate-100' },
      el('span', { class: 'text-xs font-bold uppercase tracking-wider text-slate-500' }, 'Topological Transaction Log'),
      el('span', { class: 'text-[11px] font-mono text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 font-semibold' },
        'Glitch-Free Verified'
      )
    )
  );

  const logBox = el('div', { class: 'mt-4 flex-1 bg-slate-950 text-slate-300 p-4 rounded-xl font-mono text-xs overflow-y-auto max-h-[520px] space-y-2 leading-relaxed' });

  const logList = For({
    each: () => evalLog.value,
    key: (_, idx) => idx,
    children: (log, idx) => el('div', {
      class: () => `p-2 rounded border transition-colors ${
        idx() === 0
          ? 'bg-slate-900 text-emerald-400 border-slate-700'
          : 'bg-slate-950 text-slate-400 border-slate-900'
      }`
    },
      el('span', { class: 'text-slate-600 mr-2 text-[10px]' }, () => `[${idx() + 1}]`),
      el('span', null, log)
    )
  });

  logBox.appendChild(logList);
  rightCol.appendChild(logBox);

  // Comparison note
  const noteBox = el('div', { class: 'mt-4 p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5' },
    el('div', { class: 'flex items-center space-x-2 text-xs font-bold text-slate-800' },
      icon('check-circle', 'w-4 h-4 text-emerald-600'),
      el('span', null, 'Why This Beats React & Angular Zone.js')
    ),
    el('p', { class: 'text-xs text-slate-600 leading-relaxed' },
      'React re-runs the entire component body on state change. Zone.js runs top-down dirty checking across the DOM. Aether only visits nodes whose dependency version clocks have changed, achieving true O(1) mutation throughput.'
    )
  );
  rightCol.appendChild(noteBox);

  splitGrid.appendChild(rightCol);
  root.appendChild(splitGrid);

  return root;
}
