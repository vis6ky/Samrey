/**
 * @license Apache-2.0
 * @aether/doc - Native Aether Search Modal with Fine-Grained Reactive Filtering
 */

import { el, Show, For } from '@aether/runtime';
import { signal, computed, Signal } from '@aether/reactivity';
import { icon, IconName } from '../lib/icons.js';
import { ARCHITECTURE_DECISION_RECORDS } from '../data/adrData.js';
import { SECURITY_THREATS } from '../data/securityData.js';
import { FRAMEWORK_PACKAGES } from '../data/packagesData.js';
import { ROADMAP_PHASES } from '../data/roadmapData.js';
import { DOCS_REGISTRY } from '../data/docContents.js';

export interface SearchResultItem {
  id: string;
  category: string;
  title: string;
  snippet: string;
  tabId: string;
  iconName: IconName;
}

export function SearchModal(props: {
  isOpen: Signal<boolean>;
  activeTab: Signal<string>;
}): HTMLElement {
  const searchQuery = signal('');
  const selectedIndex = signal(0);

  // All indexed items
  const allItems: SearchResultItem[] = [
    // Packages
    ...FRAMEWORK_PACKAGES.map(pkg => ({
      id: pkg.name,
      category: 'Package',
      title: pkg.name,
      snippet: `${pkg.scope}: ${pkg.description}`,
      tabId: 'architecture',
      iconName: 'cpu' as IconName
    })),
    // Security
    ...SECURITY_THREATS.map(sec => ({
      id: sec.id,
      category: 'Security Threat',
      title: `${sec.id}: ${sec.title}`,
      snippet: `${sec.category}: ${sec.vulnDescription}`,
      tabId: 'security',
      iconName: 'shield-check' as IconName
    })),
    // ADRs
    ...ARCHITECTURE_DECISION_RECORDS.map(adr => ({
      id: adr.id,
      category: 'ADR',
      title: `${adr.id}: ${adr.title}`,
      snippet: `${adr.category}: ${adr.decision}`,
      tabId: 'adr',
      iconName: 'git-pull-request' as IconName
    })),
    // Roadmap
    ...ROADMAP_PHASES.map(ph => ({
      id: `P${ph.phaseNumber}`,
      category: 'Roadmap',
      title: `Phase ${ph.phaseNumber}: ${ph.name}`,
      snippet: `Status: ${ph.status}. Target: ${ph.duration}`,
      tabId: 'roadmap',
      iconName: 'milestone' as IconName
    })),
    // Docs
    ...DOCS_REGISTRY.map(doc => ({
      id: doc.id,
      category: 'Documentation',
      title: doc.title,
      snippet: `${doc.filename} — ${doc.summary}`,
      tabId: 'docs',
      iconName: 'book-open' as IconName
    }))
  ];

  const searchResults = computed(() => {
    const q = searchQuery.value.trim().toLowerCase();
    if (!q) return allItems.slice(0, 8);
    return allItems.filter(item =>
      item.title.toLowerCase().includes(q) ||
      item.snippet.toLowerCase().includes(q) ||
      item.category.toLowerCase().includes(q)
    ).slice(0, 10);
  });

  const selectItem = (item: SearchResultItem) => {
    props.activeTab.value = item.tabId;
    props.isOpen.value = false;
    searchQuery.value = '';
    if (typeof window !== 'undefined') {
      window.location.hash = item.tabId;
    }
  };

  const modalRoot = Show({
    when: () => props.isOpen.value,
    children: () => {
      const backdrop = el('div', {
        class: 'fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-start justify-center p-4 sm:p-6 md:p-20 overflow-y-auto animate-in fade-in duration-150',
        onClick: (e: MouseEvent) => {
          if (e.target === backdrop) {
            props.isOpen.value = false;
          }
        }
      });

      const modalBox = el('div', {
        class: 'bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden flex flex-col',
        onClick: (e: MouseEvent) => e.stopPropagation()
      });

      // Search Input Row
      const inputRow = el('div', { class: 'flex items-center px-4 py-3.5 border-b border-slate-100' },
        icon('search', 'w-5 h-5 text-slate-400 mr-3 shrink-0'),
        (() => {
          const input = el('input', {
            type: 'text',
            placeholder: 'Search packages, security specs, ADRs, roadmap, documentation...',
            value: () => searchQuery.value,
            class: 'flex-1 bg-transparent text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none'
          });
          input.addEventListener('input', (e) => {
            searchQuery.value = (e.target as HTMLInputElement).value;
            selectedIndex.value = 0;
          });
          setTimeout(() => {
            if (input && typeof input.focus === 'function') {
              input.focus();
            }
          }, 50);
          return input;
        })(),
        el('button', {
          type: 'button',
          class: 'p-1 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition cursor-pointer',
          onClick: () => {
            props.isOpen.value = false;
          }
        },
          icon('x', 'w-4 h-4')
        )
      );
      modalBox.appendChild(inputRow);

      // Results List
      const resultsContainer = el('div', { class: 'max-h-96 overflow-y-auto p-2 space-y-1' });

      const resultsList = For({
        each: () => searchResults.value,
        key: (item) => item.id + item.category,
        children: (item, idx) => el('div', {
          class: () => `flex items-start space-x-3 p-3 rounded-xl cursor-pointer transition ${
            selectedIndex.value === idx() ? 'bg-slate-100 text-slate-900' : 'hover:bg-slate-50 text-slate-800'
          }`,
          onClick: () => selectItem(item)
        },
          el('div', { class: 'p-2 rounded-lg bg-slate-900 text-white shrink-0 mt-0.5' },
            icon(item.iconName, 'w-4 h-4')
          ),
          el('div', { class: 'flex-1 min-w-0' },
            el('div', { class: 'flex items-center space-x-2' },
              el('span', { class: 'font-semibold text-xs text-slate-900 truncate' }, item.title),
              el('span', { class: 'text-[10px] font-mono px-2 py-0.5 rounded bg-slate-100 text-slate-600' },
                item.category
              )
            ),
            el('p', { class: 'text-xs text-slate-500 mt-1 line-clamp-1' }, item.snippet)
          )
        )
      });

      resultsContainer.appendChild(resultsList);
      modalBox.appendChild(resultsContainer);

      // Footer Help
      const modalFooter = el('div', { class: 'px-4 py-2.5 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-[11px] font-mono text-slate-500' },
        el('div', { class: 'flex items-center space-x-3' },
          el('span', null, '↑↓ Navigate'),
          el('span', null, '↵ Select'),
          el('span', null, 'ESC Close')
        ),
        el('span', null, 'Aether Global Index')
      );
      modalBox.appendChild(modalFooter);

      backdrop.appendChild(modalBox);
      return backdrop;
    }
  });

  // Global keyboard listener for Cmd+K / Ctrl+K and Esc
  if (typeof window !== 'undefined') {
    window.addEventListener('keydown', (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        props.isOpen.value = !props.isOpen.value;
      }
      if (e.key === 'Escape' && props.isOpen.value) {
        props.isOpen.value = false;
      }
    });
  }

  const container = el('div', { class: 'aether-search-portal' });
  container.appendChild(modalRoot);
  return container;
}
