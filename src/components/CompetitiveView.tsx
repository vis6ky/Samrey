import React, { useState } from 'react';
import { CATEGORIES, DIMENSIONS } from '../data/competitiveData';
import { CategoryCode, DimensionItem } from '../types';
import { Search, Filter, CheckCircle2, AlertTriangle, ShieldAlert, Cpu, Sparkles } from 'lucide-react';

export const CompetitiveView: React.FC = () => {
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeDimension, setActiveDimension] = useState<DimensionItem | null>(DIMENSIONS[0]);

  const filteredDimensions = DIMENSIONS.filter((item) => {
    const matchesSearch = 
      item.dimension.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.react.summary.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.angular.summary.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.vue.summary.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.svelte.summary.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.solid.summary.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.aether.summary.toLowerCase().includes(searchQuery.toLowerCase());

    if (selectedCategory === 'ALL') return matchesSearch;

    const hasCategory = 
      item.react.category === selectedCategory ||
      item.angular.category === selectedCategory ||
      item.vue.category === selectedCategory ||
      item.svelte.category === selectedCategory ||
      item.solid.category === selectedCategory;

    return matchesSearch && hasCategory;
  });

  return (
    <div className="space-y-6">
      {/* Overview & Taxonomy Banner */}
      <div className="bg-slate-900 text-white rounded-2xl p-6 shadow-sm border border-slate-800">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-slate-800 text-slate-300 text-xs font-mono mb-2">
              <Cpu className="w-3.5 h-3.5 text-cyan-400" />
              <span>22-Dimension Comparative Taxonomy</span>
            </div>
            <h2 className="text-2xl font-bold tracking-tight text-white">
              Competitive Technical Evaluation
            </h2>
            <p className="text-slate-400 text-sm mt-1 max-w-3xl">
              Rigorous comparative analysis of React, Angular, Vue, Svelte, and Solid. Every design tradeoff is categorized strictly into standard architectural classifications without conflating normal framework behaviors with security vulnerabilities.
            </p>
          </div>
          <div className="flex flex-wrap gap-2 text-xs font-mono">
            <div className="px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-300">
              <span className="text-emerald-400 font-bold">5</span> Competitors
            </div>
            <div className="px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-300">
              <span className="text-cyan-400 font-bold">22</span> Dimensions
            </div>
            <div className="px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-300">
              <span className="text-amber-400 font-bold">6</span> Categories
            </div>
          </div>
        </div>

        {/* Category Pills */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 mt-6 pt-6 border-t border-slate-800">
          {Object.entries(CATEGORIES).map(([code, cat]) => (
            <button
              key={code}
              id={`cat-filter-${code}`}
              onClick={() => setSelectedCategory(selectedCategory === code ? 'ALL' : code)}
              className={`text-left p-2.5 rounded-xl border transition-all duration-150 ${
                selectedCategory === code
                  ? 'bg-white text-slate-900 border-white shadow-sm'
                  : 'bg-slate-800/60 text-slate-300 border-slate-700/60 hover:bg-slate-800'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs font-bold px-1.5 py-0.5 rounded bg-slate-700/60 text-white">
                  Cat {code}
                </span>
                {selectedCategory === code && <CheckCircle2 className="w-3.5 h-3.5 text-slate-900" />}
              </div>
              <p className="text-xs font-semibold mt-1.5 line-clamp-1">{cat.label}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            id="competitive-search-input"
            type="text"
            placeholder="Search architecture dimension, security, VDOM..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-lg bg-slate-50 border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 focus:bg-white"
          />
        </div>

        <div className="flex items-center space-x-2 text-xs text-slate-500 w-full sm:w-auto justify-between sm:justify-end">
          <div className="flex items-center space-x-1.5">
            <Filter className="w-3.5 h-3.5" />
            <span>Active Filter:</span>
            <span className="font-semibold text-slate-800">
              {selectedCategory === 'ALL' ? 'All Categories' : `Category ${selectedCategory}: ${CATEGORIES[selectedCategory]?.label}`}
            </span>
          </div>
          {selectedCategory !== 'ALL' && (
            <button
              onClick={() => setSelectedCategory('ALL')}
              className="text-xs text-slate-900 underline font-medium hover:text-slate-700"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Main Grid: Dimension List & Selected Detail */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Dimensions List */}
        <div className="lg:col-span-5 space-y-3">
          <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider px-1">
            Architectural Dimensions ({filteredDimensions.length})
          </h3>
          <div className="space-y-2 max-h-[700px] overflow-y-auto pr-1">
            {filteredDimensions.map((dim) => {
              const isSelected = activeDimension?.id === dim.id;
              return (
                <div
                  key={dim.id}
                  id={`dim-card-${dim.id}`}
                  onClick={() => setActiveDimension(dim)}
                  className={`p-4 rounded-xl border transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-slate-900 text-white border-slate-900 shadow-md ring-1 ring-slate-900'
                      : 'bg-white text-slate-800 border-slate-200 hover:border-slate-300 hover:bg-slate-50/70'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-semibold text-sm">{dim.dimension}</span>
                    <span className={`text-[11px] px-2 py-0.5 rounded-full font-mono font-medium ${
                      isSelected ? 'bg-slate-800 text-cyan-300' : 'bg-slate-100 text-slate-600'
                    }`}>
                      {dim.id}
                    </span>
                  </div>
                  <p className={`text-xs line-clamp-2 mt-1 ${isSelected ? 'text-slate-300' : 'text-slate-500'}`}>
                    <strong className={isSelected ? 'text-emerald-300' : 'text-slate-800'}>Aether:</strong> {dim.aether.summary}
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column: Deep Comparison Matrix for Active Dimension */}
        <div className="lg:col-span-7">
          {activeDimension ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-6">
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono font-semibold px-2.5 py-1 rounded bg-slate-100 text-slate-700 border border-slate-200">
                    Dimension Deep Dive
                  </span>
                  <span className="text-xs text-slate-400 font-mono">ID: {activeDimension.id}</span>
                </div>
                <h3 className="text-xl font-bold text-slate-900 mt-2">
                  {activeDimension.dimension}
                </h3>
              </div>

              {/* Aether Framework Proposed Architecture (Highlighted) */}
              <div className="p-4 rounded-xl bg-slate-900 text-white border border-slate-800 space-y-2">
                <div className="flex items-center space-x-2 text-emerald-400 text-xs font-mono font-bold">
                  <Sparkles className="w-4 h-4 text-emerald-400" />
                  <span>AETHER PROPOSED ARCHITECTURE</span>
                </div>
                <h4 className="font-bold text-base text-white">
                  {activeDimension.aether.summary}
                </h4>
                <p className="text-xs sm:text-sm text-slate-300 leading-relaxed pt-1">
                  {activeDimension.aether.architecturalSolution}
                </p>
              </div>

              {/* Competitive Frameworks Breakdown */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Competitor Implementations & Classifications
                </h4>

                {[
                  { name: 'React (v19 + RSC)', data: activeDimension.react, color: 'text-sky-600' },
                  { name: 'Angular (v18/19 Ivy + Signals)', data: activeDimension.angular, color: 'text-red-600' },
                  { name: 'Vue (v3.5 Composition)', data: activeDimension.vue, color: 'text-emerald-600' },
                  { name: 'Svelte (v5 Runes)', data: activeDimension.svelte, color: 'text-orange-600' },
                  { name: 'Solid (v1.9 / SolidStart)', data: activeDimension.solid, color: 'text-blue-600' },
                ].map((item, idx) => {
                  const cat = item.data.category ? CATEGORIES[item.data.category] : null;
                  return (
                    <div
                      key={idx}
                      className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1.5"
                    >
                      <div className="flex items-center justify-between">
                        <span className={`font-bold text-xs ${item.color}`}>{item.name}</span>
                        {cat && (
                          <span
                            className={`text-[10px] font-mono px-2 py-0.5 rounded-md font-semibold border ${cat.badgeColor}`}
                            title={cat.description}
                          >
                            Cat {cat.code}: {cat.label}
                          </span>
                        )}
                      </div>
                      <p className="text-xs font-semibold text-slate-800">{item.data.summary}</p>
                      <p className="text-xs text-slate-600 leading-relaxed">{item.data.details}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="p-12 text-center text-slate-400 bg-white rounded-2xl border border-slate-200">
              Select an architectural dimension on the left to inspect comparative findings.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
