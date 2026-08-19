import React from 'react';
import { 
  Layers, 
  Cpu, 
  ShieldCheck, 
  GitPullRequest, 
  BookOpen, 
  Activity, 
  FileCode2, 
  Milestone 
} from 'lucide-react';

interface HeaderProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export const Header: React.FC<HeaderProps> = ({ activeTab, setActiveTab }) => {
  const navItems = [
    { id: 'competitive', label: 'Competitive Analysis', icon: Layers },
    { id: 'compiler', label: 'Compiler & IR Pipeline', icon: FileCode2 },
    { id: 'reactivity', label: 'Reactivity Engine', icon: Activity },
    { id: 'security', label: 'Security Model', icon: ShieldCheck },
    { id: 'architecture', label: 'Monorepo & Packages', icon: Cpu },
    { id: 'adr', label: 'ADRs', icon: GitPullRequest },
    { id: 'roadmap', label: 'Roadmap & Non-Goals', icon: Milestone },
    { id: 'docs', label: 'Architecture Docs', icon: BookOpen },
  ];

  return (
    <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/95 backdrop-blur-md shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-slate-900 flex items-center justify-center text-white shadow-sm font-mono font-bold text-lg">
              Æ
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-semibold text-slate-900 tracking-tight text-lg">Aether Architecture</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-medium border border-emerald-200">
                  Phase 0 Approved
                </span>
              </div>
              <p className="text-xs text-slate-500 hidden sm:block">
                Production-Grade Frontend Framework Specification & Benchmark Suite
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2 text-xs font-mono text-slate-600 bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>Zero-eval · Fine-Grained · No VDOM</span>
          </div>
        </div>

        {/* Tab Navigation */}
        <nav className="flex space-x-1 overflow-x-auto py-2 scrollbar-none border-t border-slate-100">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                id={`tab-btn-${item.id}`}
                onClick={() => setActiveTab(item.id)}
                className={`flex items-center space-x-2 px-3.5 py-2 rounded-lg text-xs sm:text-sm font-medium transition-all duration-150 whitespace-nowrap ${
                  isActive
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-500'}`} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>
      </div>
    </header>
  );
};
