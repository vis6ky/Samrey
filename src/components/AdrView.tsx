import React, { useState } from 'react';
import { ARCHITECTURE_DECISION_RECORDS } from '../data/adrData';
import { ADR } from '../types';
import { GitPullRequest, CheckCircle2, AlertCircle, ArrowRight, BookOpen } from 'lucide-react';

export const AdrView: React.FC = () => {
  const [activeAdr, setActiveAdr] = useState<ADR>(ARCHITECTURE_DECISION_RECORDS[0]);

  return (
    <div className="space-y-6">
      {/* ADR Header Banner */}
      <div className="bg-slate-900 text-white rounded-2xl p-6 border border-slate-800 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-slate-800 text-amber-300 text-xs font-mono mb-2">
              <GitPullRequest className="w-3.5 h-3.5" />
              <span>Architectural Decision Records (ADRs)</span>
            </div>
            <h2 className="text-2xl font-bold tracking-tight">
              Design Justifications & Technical Tradeoffs
            </h2>
            <p className="text-slate-400 text-sm mt-1 max-w-3xl">
              Formal records capturing the technical context, explicit architectural choices, pros, cons, and alternatives considered during the design of Aether.
            </p>
          </div>

          <div className="flex items-center space-x-2 text-xs font-mono bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-700 text-slate-300">
            <span className="text-emerald-400 font-bold">8</span> Records Accepted
          </div>
        </div>
      </div>

      {/* ADR Split View */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: ADR List */}
        <div className="lg:col-span-4 space-y-2">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500 px-1">
            Decision Index ({ARCHITECTURE_DECISION_RECORDS.length})
          </span>

          <div className="space-y-1.5 max-h-[680px] overflow-y-auto pr-1">
            {ARCHITECTURE_DECISION_RECORDS.map((adr) => {
              const isSelected = activeAdr.id === adr.id;
              return (
                <div
                  key={adr.id}
                  id={`adr-item-${adr.id}`}
                  onClick={() => setActiveAdr(adr)}
                  className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-slate-900 text-white border-slate-900 shadow-md ring-1 ring-slate-900'
                      : 'bg-white text-slate-800 border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-bold">{adr.id}</span>
                    <span className={`text-[10px] font-mono px-2 py-0.5 rounded font-semibold ${
                      isSelected ? 'bg-emerald-800 text-emerald-100' : 'bg-emerald-100 text-emerald-800'
                    }`}>
                      {adr.status}
                    </span>
                  </div>
                  <h4 className="text-xs font-semibold mt-1 line-clamp-2">{adr.title}</h4>
                  <span className={`text-[10px] block mt-1 ${isSelected ? 'text-slate-400' : 'text-slate-500'}`}>
                    {adr.category}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: Selected ADR Details */}
        <div className="lg:col-span-8 bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-slate-100">
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-slate-900 text-white">
                  {activeAdr.id}
                </span>
                <span className="text-xs font-mono text-slate-500">{activeAdr.category}</span>
              </div>
              <h3 className="text-xl font-bold text-slate-900 mt-2">{activeAdr.title}</h3>
            </div>
            <span className="text-xs px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 font-semibold border border-emerald-200 self-start">
              Status: {activeAdr.status}
            </span>
          </div>

          {/* Context */}
          <div className="space-y-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              1. Context & Problem Statement
            </span>
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-sm text-slate-700 leading-relaxed">
              {activeAdr.context}
            </div>
          </div>

          {/* Decision */}
          <div className="space-y-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              2. Architectural Decision
            </span>
            <div className="p-4 rounded-xl bg-slate-900 text-white border border-slate-800 text-sm leading-relaxed">
              {activeAdr.decision}
            </div>
          </div>

          {/* Consequences Grid */}
          <div className="space-y-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              3. Tradeoffs & Consequences
            </span>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 rounded-xl bg-emerald-50/70 border border-emerald-200 space-y-2">
                <div className="flex items-center space-x-1.5 text-xs font-bold text-emerald-900">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Positive Impacts</span>
                </div>
                <ul className="space-y-1.5">
                  {activeAdr.consequences.positive.map((pos, idx) => (
                    <li key={idx} className="text-xs text-emerald-950 flex items-start space-x-1.5">
                      <span className="font-bold text-emerald-600">•</span>
                      <span>{pos}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="p-4 rounded-xl bg-amber-50/70 border border-amber-200 space-y-2">
                <div className="flex items-center space-x-1.5 text-xs font-bold text-amber-900">
                  <AlertCircle className="w-4 h-4 text-amber-600" />
                  <span>Negative Tradeoffs / Mitigations</span>
                </div>
                <ul className="space-y-1.5">
                  {activeAdr.consequences.negative.map((neg, idx) => (
                    <li key={idx} className="text-xs text-amber-950 flex items-start space-x-1.5">
                      <span className="font-bold text-amber-600">•</span>
                      <span>{neg}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          {/* Alternatives Considered */}
          <div className="space-y-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              4. Rejected Alternatives
            </span>
            <div className="flex flex-wrap gap-2">
              {activeAdr.alternatives.map((alt, idx) => (
                <span key={idx} className="text-xs font-mono px-3 py-1 rounded-lg bg-slate-100 text-slate-700 border border-slate-200">
                  ✕ {alt}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
