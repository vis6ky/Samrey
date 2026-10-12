/**
 * @license Apache-2.0
 * @samrey/doc - Root Application Shell built 100% with Native Samrey Primitives
 */

import { el, Show } from '@samrey/runtime';
import { signal, effect } from '@samrey/reactivity';
import { Header } from './components/Header.js';
import { AssistantView } from './components/AssistantView.js';
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
  // Initial tab from URL hash if present with legacy redirect support
  const legacyTabs = ['recipes', 'code-help', 'fixer', 'documentation', 'recipes-and-docs', 'help'];
  const getInitialTab = (): string => {
    if (typeof window !== 'undefined' && window.location.hash) {
      const hash = window.location.hash.replace('#', '').trim();
      if (legacyTabs.includes(hash)) {
        return 'assistant';
      }
      if (['assistant', 'competitive', 'architecture', 'task-studio', 'compiler', 'reactivity', 'security', 'adr', 'roadmap', 'docs'].includes(hash)) {
        return hash;
      }
    }
    return 'assistant';
  };

  const activeTab = signal<string>(getInitialTab());
  const isSearchOpen = signal<boolean>(false);

  // Sync hash changes and redirect legacy routes to the unified assistant
  if (typeof window !== 'undefined') {
    window.addEventListener('hashchange', () => {
      const hash = window.location.hash.replace('#', '').trim();
      if (legacyTabs.includes(hash)) {
        activeTab.value = 'assistant';
        window.history.replaceState(null, '', '#assistant');
        return;
      }
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

  const viewAssistant = Show({
    when: () => activeTab.value === 'assistant',
    children: () => AssistantView()
  });

  const viewTaskStudio = Show({
    when: () => activeTab.value === 'task-studio',
    children: () => AppShell()
  });

  const viewCompetitive = Show({
    when: () => activeTab.value === 'competitive',
    children: () => CompetitiveView()
  });

  const viewCompiler = Show({
    when: () => activeTab.value === 'compiler',
    children: () => CompilerVisualizer()
  });

  const viewReactivity = Show({
    when: () => activeTab.value === 'reactivity',
    children: () => ReactivityVisualizer()
  });

  const viewSecurity = Show({
    when: () => activeTab.value === 'security',
    children: () => SecurityView()
  });

  const viewArchitecture = Show({
    when: () => activeTab.value === 'architecture',
    children: () => ArchitectureView()
  });

  const viewAdr = Show({
    when: () => activeTab.value === 'adr',
    children: () => AdrView()
  });

  const viewRoadmap = Show({
    when: () => activeTab.value === 'roadmap',
    children: () => RoadmapView()
  });

  const viewDocs = Show({
    when: () => activeTab.value === 'docs',
    children: () => DocReader()
  });

  main.appendChild(viewAssistant);
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
        el('span', { class: 'font-mono font-bold text-slate-800' }, 'Samrey Framework'),
        el('span', null, '· 100% Native Samrey Monorepo & UI Implementation')
      ),
      el('div', { class: 'flex items-center space-x-4 font-mono text-[11px]' },
        el('span', null, 'Zero-eval · No VDOM · Fine-Grained Reactive Signals'),
        el('span', { class: 'text-slate-300' }, '|'),
        el('span', { class: 'text-emerald-600 font-semibold' }, 'v1.0.0 Production Certified')
      )
    )
  );
  root.appendChild(footer);

  return root;
}
