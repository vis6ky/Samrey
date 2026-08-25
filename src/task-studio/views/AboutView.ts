/**
 * @license Apache-2.0
 * @samrey/task-studio - Framework Architecture & About View
 */

import { el } from '@samrey/runtime';
import { Card } from '../components/ui/Card.js';
import { Badge } from '../components/ui/Badge.js';
import { Button } from '../components/ui/Button.js';

export interface AboutViewProps {
  onNavigate: (path: string) => void;
}

export function AboutView(props: AboutViewProps): HTMLElement {
  const container = el('div', { class: 'flex flex-col space-y-6 max-w-4xl mx-auto w-full select-none' });

  // 1. Header
  const header = el(
    'div',
    null,
    el('div', { class: 'flex items-center space-x-2 text-emerald-600 text-xs font-mono mb-1' },
      el('span', { class: 'w-2 h-2 rounded-full bg-emerald-500' }),
      el('span', null, 'Samrey Framework v1.0.0 GA Certified')
    ),
    el('h1', { class: 'text-2xl font-extrabold text-slate-900 tracking-tight' }, 'About Samrey Task Studio'),
    el(
      'p',
      { class: 'text-xs text-slate-500 mt-0.5' },
      'A real-world production-style task application proving framework independence, zero foreign UI dependencies, and pure native Samrey engineering.'
    )
  );
  container.appendChild(header);

  // 2. Core Pillars Card
  const pillarsCard = Card(
    {
      title: 'Architectural Foundations',
      subtitle: 'Engineered for absolute security, predictable performance, and developer clarity'
    },
    el(
      'div',
      { class: 'grid grid-cols-1 md:grid-cols-2 gap-4 text-xs' },
      el(
        'div',
        { class: 'p-4 rounded-xl bg-slate-50 border border-slate-200' },
        el('h4', { class: 'font-bold text-slate-900 mb-1' }, '⚡ Zero Virtual DOM & Direct Mutation'),
        el('p', { class: 'text-slate-600 leading-relaxed' },
          'No full-tree diffing or heavy synthetic virtual node reconciliation. Effects and signal changes directly update target text and attribute nodes.'
        )
      ),
      el(
        'div',
        { class: 'p-4 rounded-xl bg-slate-50 border border-slate-200' },
        el('h4', { class: 'font-bold text-slate-900 mb-1' }, '🛡️ Zero-Eval Security Guarantee'),
        el('p', { class: 'text-slate-600 leading-relaxed' },
          'Template processing and compilers completely avoid eval(), new Function(), and dangerous string concatenations.'
        )
      ),
      el(
        'div',
        { class: 'p-4 rounded-xl bg-slate-50 border border-slate-200' },
        el('h4', { class: 'font-bold text-slate-900 mb-1' }, '🔄 Push-Pull Glitch-Free Signals'),
        el('p', { class: 'text-slate-600 leading-relaxed' },
          'Topological graph evaluation ensures computed values evaluate at most once per batch without transient stale states or diamond graph glitches.'
        )
      ),
      el(
        'div',
        { class: 'p-4 rounded-xl bg-slate-50 border border-slate-200' },
        el('h4', { class: 'font-bold text-slate-900 mb-1' }, '📦 100% Zero Foreign Dependencies'),
        el('p', { class: 'text-slate-600 leading-relaxed' },
          'Completely free of React, Vue, Angular, Svelte, Solid, Preact, Lit, Redux, Zustand, or any third-party UI state or rendering libraries.'
        )
      )
    )
  );
  container.appendChild(pillarsCard);

  // 3. Monorepo Published Packages Matrix
  const packages = [
    { name: '@samrey/reactivity', desc: 'Push-pull signal engine, computed caches, batching & ownership lifecycle' },
    { name: '@samrey/runtime', desc: 'Direct DOM template bindings, event listeners, Show & keyed For control flow' },
    { name: '@samrey/router', desc: 'Declarative routing, pattern matcher, parameter extraction, and active link state' },
    { name: '@samrey/forms', desc: 'Standard Schema (~v1) integration, reactive field controllers, ARIA generators' },
    { name: '@samrey/http', desc: 'Resilient HTTP client, abort controllers, request caching, and reactive resources' },
    { name: '@samrey/security', desc: 'Zero-eval HTML sanitization, safe URI schemas, and prototype pollution scrubbing' },
    { name: '@samrey/ssr', desc: 'Streaming and string SSR, secret stripping, Unicode escaping, and event hydration' },
    { name: '@samrey/compiler', desc: 'ASCII template parser, semantic analyzer, AIR intermediate representation' },
    { name: '@samrey/testing', desc: 'Isolated test harness, microtask flusher, and DOM event dispatch simulator' },
    { name: '@samrey/devtools', desc: 'Performance profiler, dependency graph visualizer, and component inspector' },
    { name: '@samrey/cli', desc: 'Monorepo project scaffolding, bundle analyzers, and package validation tools' }
  ];

  const packagesCard = Card(
    {
      title: 'Samrey Monorepo Package Ecosystem',
      subtitle: 'All 11 core packages published and dogfooded directly in this application',
      padding: 'none'
    },
    el(
      'div',
      { class: 'divide-y divide-slate-100 text-xs' },
      ...packages.map((pkg) =>
        el(
          'div',
          { class: 'p-4 flex items-center justify-between gap-4 hover:bg-slate-50/80 transition' },
          el(
            'div',
            { class: 'min-w-0 flex-1' },
            el('div', { class: 'flex items-center space-x-2' },
              el('span', { class: 'font-mono font-bold text-slate-900 text-xs' }, pkg.name),
              Badge({ variant: 'neutral', value: '1.0.0' })
            ),
            el('p', { class: 'mt-0.5 text-slate-500 text-[11px]' }, pkg.desc)
          ),
          el('span', { class: 'text-[11px] font-mono text-emerald-600 font-bold shrink-0' }, '✓ Verified')
        )
      )
    )
  );
  container.appendChild(packagesCard);

  return container;
}
