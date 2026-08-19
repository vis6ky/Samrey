import React from 'react';
import { ROADMAP_PHASES, DEFERRED_FEATURES } from '../data/roadmapData';
import { Milestone, CheckCircle2, Clock, Ban, AlertTriangle, ShieldCheck, ArrowRight } from 'lucide-react';

export const RoadmapView: React.FC = () => {
  return (
    <div className="space-y-6">
      {/* Roadmap Header */}
      <div className="bg-slate-900 text-white rounded-2xl p-6 border border-slate-800 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-slate-800 text-emerald-400 text-xs font-mono mb-2">
              <Milestone className="w-3.5 h-3.5" />
              <span>Gate-Checked Phased Implementation Plan</span>
            </div>
            <h2 className="text-2xl font-bold tracking-tight">
              Development Roadmap & Explicit Non-Goals
            </h2>
            <p className="text-slate-400 text-sm mt-1 max-w-3xl">
              Strict multi-phase progression. Phase 1 will not commence until architectural consistency is certified. To maintain architectural purity and avoid premature bloat, unnecessary features are explicitly deferred.
            </p>
          </div>

          <div className="flex items-center space-x-2 text-xs font-mono bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-700 text-slate-300">
            <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
            <span>Phase 0: Signed Off</span>
          </div>
        </div>
      </div>

      {/* Explicit Deferred Features & Non-Goals Banner (Requested Highlight) */}
      <div className="bg-amber-50/80 border-2 border-amber-300 rounded-2xl p-6 shadow-xs space-y-4">
        <div className="flex items-center space-x-2 text-amber-900 font-bold text-base">
          <Ban className="w-5 h-5 text-amber-700" />
          <span>Explicitly Deferred Features & Architectural Non-Goals</span>
        </div>
        <p className="text-xs text-amber-900/80 leading-relaxed max-w-4xl">
          The following features are <strong>strictly excluded</strong> from initial milestones to avoid introducing premature complexity, runtime performance degradation, or security attack surfaces:
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {DEFERRED_FEATURES.map((item, idx) => (
            <div key={idx} className="p-4 rounded-xl bg-white border border-amber-200 shadow-2xs space-y-2">
              <div className="flex items-center space-x-1.5 text-xs font-bold text-slate-900">
                <span className="text-red-600 font-mono">✕</span>
                <span>{item.feature}</span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                <strong>Why Deferred:</strong> {item.reason}
              </p>
              <div className="text-[11px] font-mono text-emerald-800 bg-emerald-50 px-2 py-1 rounded border border-emerald-200">
                <strong>Alternative:</strong> {item.alternative}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Phased Roadmap Timeline */}
      <div className="space-y-4">
        <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500 px-1">
          Implementation Phases (0 to 7)
        </h3>

        <div className="space-y-4">
          {ROADMAP_PHASES.map((phase) => {
            const isCompleted = phase.status === 'Completed';
            const isReady = phase.status === 'Ready to Start';
            return (
              <div
                key={phase.phaseNumber}
                id={`roadmap-phase-${phase.phaseNumber}`}
                className={`p-5 rounded-2xl border transition-all ${
                  isCompleted
                    ? 'bg-white border-emerald-300 shadow-xs'
                    : isReady
                    ? 'bg-white border-slate-900 ring-1 ring-slate-900 shadow-sm'
                    : 'bg-slate-50/70 border-slate-200'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
                  <div className="flex items-center space-x-3">
                    <span className={`w-8 h-8 rounded-lg flex items-center justify-center font-mono font-bold text-sm ${
                      isCompleted
                        ? 'bg-emerald-600 text-white'
                        : isReady
                        ? 'bg-slate-900 text-white'
                        : 'bg-slate-200 text-slate-700'
                    }`}>
                      P{phase.phaseNumber}
                    </span>
                    <div>
                      <h4 className="font-bold text-slate-900 text-sm">{phase.name}</h4>
                      <span className="text-xs text-slate-500 font-mono">Target: {phase.duration}</span>
                    </div>
                  </div>

                  <span className={`text-xs px-3 py-1 rounded-full font-mono font-semibold self-start sm:self-auto border ${
                    isCompleted
                      ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                      : isReady
                      ? 'bg-slate-900 text-white border-slate-900'
                      : 'bg-slate-100 text-slate-600 border-slate-200'
                  }`}>
                    {phase.status}
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 text-xs">
                  {/* Objectives */}
                  <div className="space-y-1.5">
                    <span className="font-bold uppercase tracking-wider text-slate-500 text-[10px]">
                      Key Objectives
                    </span>
                    <ul className="space-y-1">
                      {phase.objectives.map((obj, idx) => (
                        <li key={idx} className="flex items-start space-x-1.5 text-slate-700">
                          <span className="text-slate-400">•</span>
                          <span>{obj}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Verification Gate */}
                  <div className="space-y-1.5 p-3 rounded-xl bg-slate-50 border border-slate-200">
                    <span className="font-bold uppercase tracking-wider text-emerald-800 text-[10px] flex items-center space-x-1">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Phase Verification Gate</span>
                    </span>
                    <ul className="space-y-1">
                      {phase.verificationGate.map((gate, idx) => (
                        <li key={idx} className="flex items-start space-x-1.5 text-slate-700">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                          <span>{gate}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* Deliverables */}
                <div className="mt-3 pt-3 border-t border-slate-100 flex items-center space-x-2 text-xs font-mono">
                  <span className="text-slate-500 font-semibold">Deliverables:</span>
                  <div className="flex flex-wrap gap-1.5">
                    {phase.deliverablePackages.map((pkg, idx) => (
                      <span key={idx} className="px-2 py-0.5 rounded bg-slate-100 text-slate-800 border border-slate-200 text-[11px]">
                        {pkg}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
