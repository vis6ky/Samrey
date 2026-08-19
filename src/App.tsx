import React, { useState } from 'react';
import { Header } from './components/Header';
import { CompetitiveView } from './components/CompetitiveView';
import { CompilerVisualizer } from './components/CompilerVisualizer';
import { ReactivityVisualizer } from './components/ReactivityVisualizer';
import { SecurityView } from './components/SecurityView';
import { ArchitectureView } from './components/ArchitectureView';
import { AdrView } from './components/AdrView';
import { RoadmapView } from './components/RoadmapView';
import { DocReader } from './components/DocReader';

export default function App() {
  const [activeTab, setActiveTab] = useState<string>('competitive');

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 flex flex-col antialiased font-sans">
      <Header activeTab={activeTab} setActiveTab={setActiveTab} />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'competitive' && <CompetitiveView />}
        {activeTab === 'compiler' && <CompilerVisualizer />}
        {activeTab === 'reactivity' && <ReactivityVisualizer />}
        {activeTab === 'security' && <SecurityView />}
        {activeTab === 'architecture' && <ArchitectureView />}
        {activeTab === 'adr' && <AdrView />}
        {activeTab === 'roadmap' && <RoadmapView />}
        {activeTab === 'docs' && <DocReader />}
      </main>

      <footer className="border-t border-slate-200 bg-white py-6 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-2">
          <div className="flex items-center space-x-2">
            <span className="font-mono font-bold text-slate-800">Aether Framework</span>
            <span>· Technical Architecture & Competitive Specification</span>
          </div>
          <div className="flex items-center space-x-4 font-mono text-[11px]">
            <span>Zero-eval · No VDOM · Trusted Types</span>
            <span className="text-slate-300">|</span>
            <span className="text-emerald-600 font-semibold">Phase 0 Signoff</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
