/**
 * @license Apache-2.0
 * @aether/doc - Root Application Shell built 100% with Native Aether Primitives
 */

import { el, Show } from '@aether/runtime';
import { signal, effect } from '@aether/reactivity';
import { Header } from './components/Header.js';
import { CompetitiveView } from './components/CompetitiveView.js';
import { CompilerVisualizer } from './components/CompilerVisualizer.js';
import { ReactivityVisualizer } from './components/ReactivityVisualizer.js';
import { SecurityView } from './components/SecurityView.js';
import { ArchitectureView } from './components/ArchitectureView.js';
import { AdrView } from './components/AdrView.js';
import { RoadmapView } from './components/RoadmapView.js';
import { DocReader } from './components/DocReader.js';
import { SearchModal } from './components/SearchModal.js';
import { AppShell } from './task-studio/components/AppShell.js';

export function App(): HTMLElement {
  // Initial tab from URL hash if present
  const getInitialTab = (): string => {
    if (typeof window !== 'undefined' && window.location.hash) {
      const hash = window.location.hash.replace('#', '').trim();
      if (['task-studio', 'competitive', 'compiler', 'reactivity', 'security', 'architecture', 'adr', 'roadmap', 'docs'].includes(hash)) {
        return hash;
      }
    }
    return 'task-studio';
  };

  const activeTab = signal<string>(getInitialTab());
  const isSearchOpen = signal<boolean>(false);

  // Sync hash changes
  if (typeof window !== 'undefined') {
    window.addEventListener('hashchange', () => {
      const hash = window.location.hash.replace('#', '').trim();
      if (hash && hash !== activeTab.value) {
        activeTab.value = hash;
      }
    });

    effect(() => {
      const currentTab = activeTab.value;
      if (window.location.hash !== `#${currentTab}`) {
        window.history.replaceState(null, '', `#${currentTab}`);
      }
    });
  }

  const root = el('div', { class: 'min-h-screen bg-slate-100 text-slate-900 flex flex-col antialiased font-sans' });

  // Header
  const headerNode = Header({
    activeTab,
    onOpenSearch: () => {
      isSearchOpen.value = true;
    }
  });
  root.appendChild(headerNode);

  // Search Modal
  const searchModalNode = SearchModal({
    isOpen: isSearchOpen,
    activeTab
  });
  root.appendChild(searchModalNode);

  // Main content area
  const main = el('main', {
    class: () =>
      activeTab.value === 'task-studio'
        ? 'flex-1 w-full p-0'
        : 'flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8'
  });

  // Lazy cache instantiated views to avoid duplicate work
  let taskStudioEl: HTMLElement | null = null;
  let competitiveEl: HTMLElement | null = null;
  let compilerEl: HTMLElement | null = null;
  let reactivityEl: HTMLElement | null = null;
  let securityEl: HTMLElement | null = null;
  let architectureEl: HTMLElement | null = null;
  let adrEl: HTMLElement | null = null;
  let roadmapEl: HTMLElement | null = null;
  let docsEl: HTMLElement | null = null;

  const viewTaskStudio = Show({
    when: () => activeTab.value === 'task-studio',
    children: () => {
      if (!taskStudioEl) taskStudioEl = AppShell();
      return taskStudioEl;
    }
  });

  const viewCompetitive = Show({
    when: () => activeTab.value === 'competitive',
    children: () => {
      if (!competitiveEl) competitiveEl = CompetitiveView();
      return competitiveEl;
    }
  });

  const viewCompiler = Show({
    when: () => activeTab.value === 'compiler',
    children: () => {
      if (!compilerEl) compilerEl = CompilerVisualizer();
      return compilerEl;
    }
  });

  const viewReactivity = Show({
    when: () => activeTab.value === 'reactivity',
    children: () => {
      if (!reactivityEl) reactivityEl = ReactivityVisualizer();
      return reactivityEl;
    }
  });

  const viewSecurity = Show({
    when: () => activeTab.value === 'security',
    children: () => {
      if (!securityEl) securityEl = SecurityView();
      return securityEl;
    }
  });

  const viewArchitecture = Show({
    when: () => activeTab.value === 'architecture',
    children: () => {
      if (!architectureEl) architectureEl = ArchitectureView();
      return architectureEl;
    }
  });

  const viewAdr = Show({
    when: () => activeTab.value === 'adr',
    children: () => {
      if (!adrEl) adrEl = AdrView();
      return adrEl;
    }
  });

  const viewRoadmap = Show({
    when: () => activeTab.value === 'roadmap',
    children: () => {
      if (!roadmapEl) roadmapEl = RoadmapView();
      return roadmapEl;
    }
  });

  const viewDocs = Show({
    when: () => activeTab.value === 'docs',
    children: () => {
      if (!docsEl) docsEl = DocReader();
      return docsEl;
    }
  });

  main.appendChild(viewTaskStudio);
  main.appendChild(viewCompetitive);
  main.appendChild(viewCompiler);
  main.appendChild(viewReactivity);
  main.appendChild(viewSecurity);
  main.appendChild(viewArchitecture);
  main.appendChild(viewAdr);
  main.appendChild(viewRoadmap);
  main.appendChild(viewDocs);
  root.appendChild(main);

  // Footer
  const footer = el('footer', { class: 'border-t border-slate-200 bg-white py-6 mt-12' },
    el('div', { class: 'max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-2' },
      el('div', { class: 'flex items-center space-x-2' },
        el('span', { class: 'font-mono font-bold text-slate-800' }, 'Aether Framework'),
        el('span', null, '· 100% Native Aether Monorepo & UI Implementation')
      ),
      el('div', { class: 'flex items-center space-x-4 font-mono text-[11px]' },
        el('span', null, 'Zero-eval · No VDOM · Fine-Grained Reactive Signals'),
        el('span', { class: 'text-slate-300' }, '|'),
        el('span', { class: 'text-emerald-600 font-semibold' }, 'Phase 14.5 Certified')
      )
    )
  );
  root.appendChild(footer);

  return root;
}
