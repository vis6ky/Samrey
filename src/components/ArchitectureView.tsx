import React, { useState } from 'react';
import { FRAMEWORK_PACKAGES } from '../data/packagesData';
import { FrameworkPackage } from '../types';
import { Cpu, Box, GitBranch, ArrowRight, ShieldCheck, Zap, HardDrive } from 'lucide-react';

export const ArchitectureView: React.FC = () => {
  const [selectedPackage, setSelectedPackage] = useState<FrameworkPackage>(FRAMEWORK_PACKAGES[0]);

  return (
    <div className="space-y-6">
      {/* Overview Banner */}
      <div className="bg-slate-900 text-white rounded-2xl p-6 border border-slate-800 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-slate-800 text-purple-300 text-xs font-mono mb-2">
              <Cpu className="w-3.5 h-3.5" />
              <span>Acyclic Monorepo Topology</span>
            </div>
            <h2 className="text-2xl font-bold tracking-tight">
              Aether Monorepo & Package Architecture
            </h2>
            <p className="text-slate-400 text-sm mt-1 max-w-3xl">
              12 cohesive, tree-shakeable packages. Foundational reactivity and security primitives have zero dependencies, ensuring strict architectural isolation and minimal bundle footprints.
            </p>
          </div>

          <div className="flex flex-wrap gap-2 text-xs font-mono">
            <div className="px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-300">
              <span className="text-emerald-400 font-bold">12</span> Packages
            </div>
            <div className="px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-300">
              <span className="text-cyan-400 font-bold">&lt; 7 kB</span> Core Runtime
            </div>
            <div className="px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-300">
              <span className="text-purple-400 font-bold">100%</span> Type-Safe
            </div>
          </div>
        </div>
      </div>

      {/* Package Monorepo Explorer */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Package List */}
        <div className="lg:col-span-4 space-y-2">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500 px-1">
            Monorepo Packages ({FRAMEWORK_PACKAGES.length})
          </span>

          <div className="space-y-1.5 max-h-[680px] overflow-y-auto pr-1">
            {FRAMEWORK_PACKAGES.map((pkg) => {
              const isSelected = selectedPackage.name === pkg.name;
              return (
                <div
                  key={pkg.name}
                  id={`pkg-item-${pkg.name.replace('@', '').replace('/', '-')}`}
                  onClick={() => setSelectedPackage(pkg)}
                  className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-slate-900 text-white border-slate-900 shadow-md ring-1 ring-slate-900'
                      : 'bg-white text-slate-800 border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-bold">{pkg.name}</span>
                    <span className={`text-[10px] font-mono px-2 py-0.5 rounded font-semibold ${
                      isSelected ? 'bg-slate-800 text-cyan-300' : 'bg-slate-100 text-slate-600'
                    }`}>
                      {pkg.bundleBudget}
                    </span>
                  </div>
                  <p className={`text-xs mt-1 line-clamp-1 ${isSelected ? 'text-slate-300' : 'text-slate-500'}`}>
                    {pkg.scope}
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column: Selected Package Specification */}
        <div className="lg:col-span-8 bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-slate-100">
            <div>
              <span className="text-xs font-mono font-bold px-2.5 py-1 rounded bg-slate-100 text-slate-700 border border-slate-200">
                {selectedPackage.scope}
              </span>
              <h3 className="text-xl font-bold font-mono text-slate-900 mt-2">
                {selectedPackage.name}
              </h3>
            </div>
            <div className="flex items-center space-x-2 text-xs font-mono text-slate-700 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200">
              <HardDrive className="w-3.5 h-3.5 text-slate-500" />
              <span>Target Budget: <strong>{selectedPackage.bundleBudget}</strong></span>
            </div>
          </div>

          <p className="text-sm text-slate-700 leading-relaxed">
            {selectedPackage.description}
          </p>

          {/* Dependencies & Key Exports */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
              <div className="flex items-center space-x-1.5 text-xs font-bold text-slate-800 uppercase tracking-wider">
                <GitBranch className="w-3.5 h-3.5 text-slate-500" />
                <span>Internal Dependencies</span>
              </div>
              {selectedPackage.dependencies.length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                  {selectedPackage.dependencies.map((dep, idx) => (
                    <span key={idx} className="text-xs font-mono px-2 py-0.5 rounded bg-white text-slate-800 border border-slate-200 shadow-2xs">
                      {dep}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-emerald-600 font-mono font-semibold">
                  Zero internal dependencies (Root Leaf)
                </p>
              )}
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
              <div className="flex items-center space-x-1.5 text-xs font-bold text-slate-800 uppercase tracking-wider">
                <Box className="w-3.5 h-3.5 text-slate-500" />
                <span>Primary Exports</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {selectedPackage.keyExports.map((exp, idx) => (
                  <span key={idx} className="text-xs font-mono px-2 py-0.5 rounded bg-white text-slate-800 border border-slate-200 shadow-2xs">
                    {exp}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Responsibilities */}
          <div className="space-y-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Core Architectural Responsibilities
            </span>
            <ul className="space-y-1.5">
              {selectedPackage.responsibilities.map((resp, idx) => (
                <li key={idx} className="flex items-start space-x-2 text-xs text-slate-700">
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-900 mt-1.5 shrink-0"></span>
                  <span>{resp}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Security Boundary */}
          <div className="p-4 rounded-xl bg-cyan-50/70 border border-cyan-200 space-y-1.5">
            <div className="flex items-center space-x-2 text-xs font-bold text-cyan-900">
              <ShieldCheck className="w-4 h-4 text-cyan-700" />
              <span>Security & Isolation Boundary</span>
            </div>
            <p className="text-xs text-cyan-950 leading-relaxed">
              {selectedPackage.securityBoundary}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
