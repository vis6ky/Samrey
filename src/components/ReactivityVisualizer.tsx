import React, { useState } from 'react';
import { Activity, Play, RotateCcw, CheckCircle2, Clock, Zap, ArrowDown, GitCommit } from 'lucide-react';

export const ReactivityVisualizer: React.FC = () => {
  // Reactive Signal States
  const [signalA, setSignalA] = useState<number>(5);
  const [signalB, setSignalB] = useState<number>(3);
  const [clock, setClock] = useState<number>(1);
  const [evalLog, setEvalLog] = useState<string[]>([
    'Clock #1: Graph initialized. Root scope created.',
    'Signal A = 5 (ver: 1), Signal B = 3 (ver: 1)',
    'Computed C (A + B) evaluated -> 8',
    'Computed D (C * 2) evaluated -> 16',
    'Computed E (C + 10) evaluated -> 18',
    'DOM Effect (D + E) evaluated -> 34 (1 evaluation; 0 glitches)'
  ]);

  // Derived Values
  const computedC = signalA + signalB;
  const computedD = computedC * 2;
  const computedE = computedC + 10;
  const domEffectOutput = computedD + computedE;

  const handleMutateA = (delta: number) => {
    const newVal = signalA + delta;
    const newClock = clock + 1;
    setSignalA(newVal);
    setClock(newClock);

    const newC = newVal + signalB;
    const newD = newC * 2;
    const newE = newC + 10;
    const newDom = newD + newE;

    setEvalLog((prev) => [
      `Clock #${newClock}: [Transaction Begin] Signal A mutated: ${signalA} -> ${newVal}`,
      `Clock #${newClock}: Push Phase -> Mark C, D, E, and DOM Effect as STALE (Dirty Flag = true)`,
      `Clock #${newClock}: Pull Phase (Topological Level 1) -> Computed C re-evaluated -> ${newC}`,
      `Clock #${newClock}: Pull Phase (Topological Level 2) -> Computed D re-evaluated -> ${newD}`,
      `Clock #${newClock}: Pull Phase (Topological Level 2) -> Computed E re-evaluated -> ${newE}`,
      `Clock #${newClock}: Commit Phase (Topological Level 3) -> DOM Effect flushed once -> ${newDom}`,
      ...prev.slice(0, 10)
    ]);
  };

  const handleMutateB = (delta: number) => {
    const newVal = signalB + delta;
    const newClock = clock + 1;
    setSignalB(newVal);
    setClock(newClock);

    const newC = signalA + newVal;
    const newD = newC * 2;
    const newE = newC + 10;
    const newDom = newD + newE;

    setEvalLog((prev) => [
      `Clock #${newClock}: [Transaction Begin] Signal B mutated: ${signalB} -> ${newVal}`,
      `Clock #${newClock}: Push Phase -> Mark C, D, E, and DOM Effect as STALE`,
      `Clock #${newClock}: Pull Phase -> Computed C: ${newC}, Computed D: ${newD}, Computed E: ${newE}`,
      `Clock #${newClock}: Commit Phase -> DOM TextNode updated to "${newDom}" (Zero VDOM Diffing)`,
      ...prev.slice(0, 10)
    ]);
  };

  const handleReset = () => {
    setSignalA(5);
    setSignalB(3);
    setClock(1);
    setEvalLog([
      'Clock #1: Graph reset to baseline.',
      'Signal A = 5, Signal B = 3',
      'Computed C = 8, D = 16, E = 18, DOM Effect = 34'
    ]);
  };

  return (
    <div className="space-y-6">
      {/* Visual Header */}
      <div className="bg-slate-900 text-white rounded-2xl p-6 border border-slate-800 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-slate-800 text-emerald-400 text-xs font-mono mb-2">
              <Activity className="w-3.5 h-3.5" />
              <span>Push-Pull Topological Reactive Engine</span>
            </div>
            <h2 className="text-2xl font-bold tracking-tight">
              Glitch-Free Reactive Graph Simulator
            </h2>
            <p className="text-slate-400 text-sm mt-1 max-w-3xl">
              Simulate Aether&apos;s O(1) transaction clock, dynamic dependency tracking, and atomic batching. Experience how the classic Diamond Dependency problem is resolved with exactly one evaluation pass and zero intermediate glitch states.
            </p>
          </div>

          <div className="flex items-center space-x-3 bg-slate-800/80 px-4 py-2 rounded-xl border border-slate-700 font-mono text-xs">
            <Clock className="w-4 h-4 text-cyan-400" />
            <span>Transaction Clock:</span>
            <span className="font-bold text-emerald-400 text-sm">#{clock}</span>
          </div>
        </div>
      </div>

      {/* Reactive Graph Canvas & Controls */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Interactive Graph Nodes */}
        <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-6">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Live Dependency Topology
            </span>
            <button
              onClick={handleReset}
              className="inline-flex items-center space-x-1.5 text-xs text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-lg transition-colors font-medium"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset State</span>
            </button>
          </div>

          {/* Graph Visualization */}
          <div className="space-y-6">
            {/* Level 0: Source Signals */}
            <div className="grid grid-cols-2 gap-4">
              {/* Node Signal A */}
              <div className="p-4 rounded-xl bg-slate-50 border-2 border-slate-300 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-slate-200 text-slate-800">
                    Signal(A)
                  </span>
                  <span className="text-[11px] font-mono text-slate-500">Level 0</span>
                </div>
                <div className="text-2xl font-bold font-mono text-slate-900">{signalA}</div>
                <div className="flex space-x-2">
                  <button
                    id="mutate-a-inc"
                    onClick={() => handleMutateA(1)}
                    className="flex-1 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-mono font-bold transition-all"
                  >
                    +1
                  </button>
                  <button
                    id="mutate-a-dec"
                    onClick={() => handleMutateA(-1)}
                    className="flex-1 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-lg text-xs font-mono font-bold transition-all"
                  >
                    -1
                  </button>
                </div>
              </div>

              {/* Node Signal B */}
              <div className="p-4 rounded-xl bg-slate-50 border-2 border-slate-300 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-slate-200 text-slate-800">
                    Signal(B)
                  </span>
                  <span className="text-[11px] font-mono text-slate-500">Level 0</span>
                </div>
                <div className="text-2xl font-bold font-mono text-slate-900">{signalB}</div>
                <div className="flex space-x-2">
                  <button
                    id="mutate-b-inc"
                    onClick={() => handleMutateB(1)}
                    className="flex-1 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-mono font-bold transition-all"
                  >
                    +1
                  </button>
                  <button
                    id="mutate-b-dec"
                    onClick={() => handleMutateB(-1)}
                    className="flex-1 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-lg text-xs font-mono font-bold transition-all"
                  >
                    -1
                  </button>
                </div>
              </div>
            </div>

            <div className="flex justify-center text-slate-400">
              <ArrowDown className="w-5 h-5 animate-bounce" />
            </div>

            {/* Level 1: Computed C */}
            <div className="p-4 rounded-xl bg-purple-50 border-2 border-purple-200 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-purple-200 text-purple-900">
                  Computed(C = A + B)
                </span>
                <span className="text-[11px] font-mono text-purple-700">Level 1 · Memoized</span>
              </div>
              <div className="text-2xl font-bold font-mono text-purple-950">{computedC}</div>
              <p className="text-[11px] text-purple-700 font-mono">
                Deps: [Signal A, Signal B] · Evaluates ONLY when A or B changes
              </p>
            </div>

            <div className="flex justify-center text-slate-400">
              <ArrowDown className="w-5 h-5" />
            </div>

            {/* Level 2: Computed D & E (Diamond Branches) */}
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 rounded-xl bg-blue-50 border-2 border-blue-200 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-blue-200 text-blue-900">
                    Computed(D = C * 2)
                  </span>
                  <span className="text-[11px] font-mono text-blue-700">Level 2</span>
                </div>
                <div className="text-2xl font-bold font-mono text-blue-950">{computedD}</div>
              </div>

              <div className="p-4 rounded-xl bg-indigo-50 border-2 border-indigo-200 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-indigo-200 text-indigo-900">
                    Computed(E = C + 10)
                  </span>
                  <span className="text-[11px] font-mono text-indigo-700">Level 2</span>
                </div>
                <div className="text-2xl font-bold font-mono text-indigo-950">{computedE}</div>
              </div>
            </div>

            <div className="flex justify-center text-slate-400">
              <ArrowDown className="w-5 h-5" />
            </div>

            {/* Level 3: DOM Effect (Diamond Join) */}
            <div className="p-5 rounded-xl bg-emerald-900 text-white border-2 border-emerald-700 space-y-2 shadow-sm">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Zap className="w-4 h-4 text-emerald-300" />
                  <span className="text-xs font-mono font-bold text-emerald-200">
                    DOM Effect Sink (Output = D + E)
                  </span>
                </div>
                <span className="text-xs px-2 py-0.5 rounded bg-emerald-800 text-emerald-100 font-mono">
                  Level 3 · Surgical DOM Slot
                </span>
              </div>
              <div className="text-3xl font-bold font-mono text-white">{domEffectOutput}</div>
              <p className="text-xs text-emerald-200">
                Topologically ordered: Evaluated exactly <strong>1 time</strong> per clock tick. Zero glitch states.
              </p>
            </div>
          </div>
        </div>

        {/* Right: Transaction Log & Execution Diagnostics */}
        <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200 p-6 shadow-xs flex flex-col">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Topological Transaction Log
            </span>
            <span className="text-[11px] font-mono text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 font-semibold">
              Glitch-Free Verified
            </span>
          </div>

          <div className="mt-4 flex-1 bg-slate-950 text-slate-300 p-4 rounded-xl font-mono text-xs overflow-y-auto max-h-[520px] space-y-2 leading-relaxed">
            {evalLog.map((log, index) => (
              <div
                key={index}
                className={`p-2 rounded border transition-colors ${
                  index === 0
                    ? 'bg-slate-900 text-emerald-400 border-slate-700'
                    : 'bg-slate-950 text-slate-400 border-slate-900'
                }`}
              >
                <span className="text-slate-600 mr-2 text-[10px]">[{index + 1}]</span>
                {log}
              </div>
            ))}
          </div>

          <div className="mt-4 p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5">
            <div className="flex items-center space-x-2 text-xs font-bold text-slate-800">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>Why This Beats React & Angular Zone.js</span>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              React re-runs the entire component body on state change. Zone.js runs top-down dirty checking across the DOM. Aether only visits nodes whose dependency version clocks have changed, achieving true $O(1)$ mutation throughput.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
