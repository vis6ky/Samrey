/**
 * @license Apache-2.0
 * @samrey/doc - Native Samrey Competitive Analysis & Table Comparison View
 */

import { el, Show, For } from '@samrey/runtime';
import { signal, computed } from '@samrey/reactivity';
import { CATEGORIES, DIMENSIONS } from '../data/competitiveData.js';
import { COMPARISON_TABLE_ROWS, FEATURE_CODE_EXAMPLES, FeatureCodeExample } from '../data/comparisonTableData.js';
import { DimensionItem } from '../types.js';
import { icon, IconName } from '../lib/icons.js';

export function CompetitiveView(): HTMLElement {
  // Main view mode: 'table' | 'code' | 'dimensions'
  const viewMode = signal<'table' | 'code' | 'dimensions'>('table');

  // Dimension explorer state
  const selectedCategory = signal<string>('ALL');
  const searchQuery = signal<string>('');
  const activeDimension = signal<DimensionItem | null>(DIMENSIONS[0]);

  // Code comparison state
  const selectedFeature = signal<FeatureCodeExample>(FEATURE_CODE_EXAMPLES[0]);
  const activeFrameworkTab = signal<'samrey' | 'react' | 'vue' | 'angular'>('samrey');
  const copiedStatus = signal<boolean>(false);

  const filteredDimensions = computed(() => {
    const query = searchQuery.value.trim().toLowerCase();
    const cat = selectedCategory.value;

    return DIMENSIONS.filter((item) => {
      const matchesSearch =
        !query ||
        item.dimension.toLowerCase().includes(query) ||
        item.react.summary.toLowerCase().includes(query) ||
        item.angular.summary.toLowerCase().includes(query) ||
        item.vue.summary.toLowerCase().includes(query) ||
        item.svelte.summary.toLowerCase().includes(query) ||
        item.solid.summary.toLowerCase().includes(query) ||
        item.samrey.summary.toLowerCase().includes(query);

      if (cat === 'ALL') return matchesSearch;

      const hasCategory =
        item.react.category === cat ||
        item.angular.category === cat ||
        item.vue.category === cat ||
        item.svelte.category === cat ||
        item.solid.category === cat;

      return matchesSearch && hasCategory;
    });
  });

  const root = el('div', { class: 'space-y-6' });

  // Top Overview Banner
  const banner = el('div', { class: 'bg-slate-900 text-white rounded-2xl p-6 sm:p-8 shadow-sm border border-slate-800' },
    el('div', { class: 'flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6' },
      el('div', { class: 'space-y-2' },
        el('div', { class: 'inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-slate-800 text-cyan-400 text-xs font-mono' },
          icon('layers', 'w-3.5 h-3.5'),
          el('span', null, 'Framework Evaluation & Architectural Objective Matrix')
        ),
        el('h2', { class: 'text-2xl sm:text-3xl font-bold tracking-tight text-white' },
          'Samrey vs. React vs. Vue vs. Angular'
        ),
        el('p', { class: 'text-slate-400 text-xs sm:text-sm max-w-3xl leading-relaxed' },
          'Detailed comparative analysis demonstrating how Samrey delivers zero-eval security, direct native DOM mutations, and fine-grained push-pull reactivity compared to Virtual DOM reconciliation and heavy class-based frameworks.'
        )
      ),
      el('div', { class: 'flex flex-wrap gap-2 text-xs font-mono' },
        el('div', { class: 'px-3 py-2 rounded-xl bg-slate-800/90 border border-slate-700 text-slate-300' },
          el('span', { class: 'text-emerald-400 font-bold text-sm block' }, 'Push-Pull'),
          el('span', { class: 'text-[11px] text-slate-400' }, 'Signals Engine')
        ),
        el('div', { class: 'px-3 py-2 rounded-xl bg-slate-800/90 border border-slate-700 text-slate-300' },
          el('span', { class: 'text-cyan-400 font-bold text-sm block' }, '0 kB VDOM'),
          el('span', { class: 'text-[11px] text-slate-400' }, 'Direct Template Cloning')
        ),
        el('div', { class: 'px-3 py-2 rounded-xl bg-slate-800/90 border border-slate-700 text-slate-300' },
          el('span', { class: 'text-purple-400 font-bold text-sm block' }, '< 7 kB'),
          el('span', { class: 'text-[11px] text-slate-400' }, 'Core Min+Gzip')
        )
      )
    )
  );
  root.appendChild(banner);

  // Sub-Navigation Tabs: Table Matrix | Code Comparison | 22-Dimension Explorer
  const navTabsContainer = el('div', { class: 'bg-white rounded-2xl border border-slate-200 p-2 shadow-xs flex flex-wrap gap-2' });

  const modes: { id: 'table' | 'code' | 'dimensions'; label: string; icon: IconName }[] = [
    { id: 'table', label: '📊 Comparison Table Matrix', icon: 'layers' },
    { id: 'code', label: '💻 Feature Code Comparison (Side-by-Side)', icon: 'file-code' },
    { id: 'dimensions', label: '🔍 22-Dimension Taxonomy & Details', icon: 'cpu' }
  ];

  for (const m of modes) {
    const btn = el('button', {
      type: 'button',
      id: `btn-mode-${m.id}`,
      class: () => `flex items-center space-x-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition cursor-pointer ${
        viewMode.value === m.id
          ? 'bg-slate-900 text-white shadow-xs'
          : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
      }`,
      onClick: () => {
        viewMode.value = m.id;
      }
    },
      icon(m.icon, 'w-4 h-4'),
      el('span', null, m.label)
    );
    navTabsContainer.appendChild(btn);
  }
  root.appendChild(navTabsContainer);

  // -------------------------------------------------------------
  // VIEW 1: TABLE COMPARISON MATRIX
  // -------------------------------------------------------------
  const tableView = Show({
    when: () => viewMode.value === 'table',
    children: () => {
      const container = el('div', { class: 'space-y-6' });

      // Table Card
      const card = el('div', { class: 'bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden' });

      // Card Header
      const header = el('div', { class: 'p-5 sm:p-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3' },
        el('div', null,
          el('h3', { class: 'text-lg font-bold text-slate-900' }, 'Core Architectural Matrix'),
          el('p', { class: 'text-xs text-slate-500 mt-0.5' }, 'Direct comparison of runtime mechanics, developer constraints, and performance guarantees.')
        ),
        el('div', { class: 'flex items-center space-x-2 text-xs font-mono bg-emerald-50 text-emerald-800 border border-emerald-200 px-3 py-1.5 rounded-lg' },
          el('span', { class: 'w-2 h-2 rounded-full bg-emerald-500' }),
          el('span', null, 'Samrey Advantage Certified')
        )
      );
      card.appendChild(header);

      // Responsive Table Wrapper
      const tableWrapper = el('div', { class: 'overflow-x-auto' });
      const table = el('table', { class: 'w-full text-left border-collapse text-xs sm:text-sm' });

      // Table Head
      const thead = el('thead', { class: 'bg-slate-50/80 border-b border-slate-200 text-slate-700 font-mono text-xs uppercase tracking-wider' },
        el('tr', null,
          el('th', { class: 'py-3.5 px-4 font-bold' }, 'Feature / Dimension'),
          el('th', { class: 'py-3.5 px-4 font-bold bg-slate-900 text-cyan-300' }, '▲ Samrey Framework'),
          el('th', { class: 'py-3.5 px-4 font-bold' }, 'React (v19)'),
          el('th', { class: 'py-3.5 px-4 font-bold' }, 'Vue 3 (Composition)'),
          el('th', { class: 'py-3.5 px-4 font-bold' }, 'Angular (v17+ Signals)')
        )
      );
      table.appendChild(thead);

      // Table Body
      const tbody = el('tbody', { class: 'divide-y divide-slate-100' });
      for (const row of COMPARISON_TABLE_ROWS) {
        const tr = el('tr', { class: 'hover:bg-slate-50/60 transition' },
          // Dimension Label
          el('td', { class: 'py-4 px-4 align-top font-medium text-slate-900 border-r border-slate-100 min-w-[160px]' },
            el('div', { class: 'font-bold text-xs sm:text-sm text-slate-900' }, row.dimension),
            el('span', { class: 'inline-block mt-1 text-[10px] font-mono px-2 py-0.5 rounded bg-slate-100 text-slate-600' }, row.category)
          ),
          // Samrey Column (Highlighted)
          el('td', { class: 'py-4 px-4 align-top bg-cyan-50/30 border-r border-slate-200 min-w-[220px]' },
            el('div', { class: 'inline-block px-2.5 py-1 rounded-md bg-slate-900 text-emerald-300 font-mono text-xs font-bold mb-1.5' },
              row.samrey.badge
            ),
            el('p', { class: 'text-xs text-slate-700 leading-relaxed font-sans' }, row.samrey.description)
          ),
          // React Column
          el('td', { class: 'py-4 px-4 align-top border-r border-slate-100 min-w-[190px]' },
            el('div', { class: 'inline-block px-2 py-0.5 rounded bg-slate-100 text-slate-800 font-mono text-xs font-semibold mb-1.5' },
              row.react.badge
            ),
            el('p', { class: 'text-xs text-slate-600 leading-relaxed' }, row.react.description)
          ),
          // Vue 3 Column
          el('td', { class: 'py-4 px-4 align-top border-r border-slate-100 min-w-[190px]' },
            el('div', { class: 'inline-block px-2 py-0.5 rounded bg-slate-100 text-slate-800 font-mono text-xs font-semibold mb-1.5' },
              row.vue.badge
            ),
            el('p', { class: 'text-xs text-slate-600 leading-relaxed' }, row.vue.description)
          ),
          // Angular Column
          el('td', { class: 'py-4 px-4 align-top min-w-[190px]' },
            el('div', { class: 'inline-block px-2 py-0.5 rounded bg-slate-100 text-slate-800 font-mono text-xs font-semibold mb-1.5' },
              row.angular.badge
            ),
            el('p', { class: 'text-xs text-slate-600 leading-relaxed' }, row.angular.description)
          )
        );
        tbody.appendChild(tr);
      }
      table.appendChild(tbody);
      tableWrapper.appendChild(table);
      card.appendChild(tableWrapper);
      container.appendChild(card);

      // Objective Fulfillment Takeaways Card
      const objectiveCard = el('div', { class: 'grid grid-cols-1 md:grid-cols-3 gap-4' },
        el('div', { class: 'bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-2' },
          el('div', { class: 'flex items-center space-x-2 text-slate-900 font-bold text-sm' },
            icon('zap', 'w-4 h-4 text-amber-500'),
            el('span', null, 'Direct DOM vs Virtual DOM')
          ),
          el('p', { class: 'text-xs text-slate-600 leading-relaxed' },
            'Samrey clones pre-parsed native <template> nodes and updates text node pointers directly. Bypasses recursive tree diffing and VDOM garbage collection overhead entirely.'
          )
        ),
        el('div', { class: 'bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-2' },
          el('div', { class: 'flex items-center space-x-2 text-slate-900 font-bold text-sm' },
            icon('shield-check', 'w-4 h-4 text-emerald-500'),
            el('span', null, 'Zero-Eval Enterprise Security')
          ),
          el('p', { class: 'text-xs text-slate-600 leading-relaxed' },
            'Built-in @samrey/security module enforces W3C Trusted Types, URI scheme whitelisting, and HMAC CSRF protection with zero eval/Function() runtime vectors.'
          )
        ),
        el('div', { class: 'bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-2' },
          el('div', { class: 'flex items-center space-x-2 text-slate-900 font-bold text-sm' },
            icon('activity', 'w-4 h-4 text-cyan-500'),
            el('span', null, 'Zero Hook Rules Ergonomics')
          ),
          el('p', { class: 'text-xs text-slate-600 leading-relaxed' },
            'Signals are plain reactive primitives that run in loops, conditionals, and standard TypeScript helper modules without React hook ordering constraints or stale closures.'
          )
        )
      );
      container.appendChild(objectiveCard);

      return container;
    }
  });
  root.appendChild(tableView);

  // -------------------------------------------------------------
  // VIEW 2: FEATURE CODE COMPARISON (SIDE-BY-SIDE)
  // -------------------------------------------------------------
  const codeView = Show({
    when: () => viewMode.value === 'code',
    children: () => {
      const container = el('div', { class: 'space-y-6' });

      // Feature Selector Tabs
      const featureTabs = el('div', { class: 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3' });
      for (const feat of FEATURE_CODE_EXAMPLES) {
        const fBtn = el('button', {
          type: 'button',
          id: `feat-btn-${feat.id}`,
          class: () => {
            const isSelected = selectedFeature.value.id === feat.id;
            return `p-4 rounded-xl border text-left transition cursor-pointer ${
              isSelected
                ? 'bg-slate-900 text-white border-slate-900 shadow-md ring-1 ring-slate-900'
                : 'bg-white text-slate-800 border-slate-200 hover:border-slate-300 hover:bg-slate-50'
            }`;
          },
          onClick: () => {
            selectedFeature.value = feat;
          }
        },
          el('div', { class: 'text-[10px] font-mono uppercase tracking-wider opacity-70 mb-1' }, feat.category),
          el('div', { class: 'text-xs font-bold' }, feat.title)
        );
        featureTabs.appendChild(fBtn);
      }
      container.appendChild(featureTabs);

      // Code Card
      const codeCard = el('div', { class: 'bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden' });

      // Code Header & Framework Switcher
      const codeHeader = el('div', { class: 'p-5 border-b border-slate-200 bg-slate-50/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3' },
        el('div', null,
          el('h3', { class: 'text-base font-bold text-slate-900' }, () => selectedFeature.value.title),
          el('p', { class: 'text-xs text-slate-500 mt-0.5' }, () => selectedFeature.value.description)
        ),
        // Framework Selector Pills
        el('div', { class: 'flex items-center space-x-1.5 bg-white p-1 rounded-xl border border-slate-200 shadow-2xs' },
          el('button', {
            type: 'button',
            class: () => `px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition cursor-pointer ${
              activeFrameworkTab.value === 'samrey' ? 'bg-slate-900 text-cyan-300 shadow-xs' : 'text-slate-600 hover:bg-slate-100'
            }`,
            onClick: () => { activeFrameworkTab.value = 'samrey'; }
          }, '▲ Samrey (TS)'),
          el('button', {
            type: 'button',
            class: () => `px-3 py-1.5 rounded-lg text-xs font-mono font-medium transition cursor-pointer ${
              activeFrameworkTab.value === 'react' ? 'bg-slate-900 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-100'
            }`,
            onClick: () => { activeFrameworkTab.value = 'react'; }
          }, 'React 19'),
          el('button', {
            type: 'button',
            class: () => `px-3 py-1.5 rounded-lg text-xs font-mono font-medium transition cursor-pointer ${
              activeFrameworkTab.value === 'vue' ? 'bg-slate-900 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-100'
            }`,
            onClick: () => { activeFrameworkTab.value = 'vue'; }
          }, 'Vue 3'),
          el('button', {
            type: 'button',
            class: () => `px-3 py-1.5 rounded-lg text-xs font-mono font-medium transition cursor-pointer ${
              activeFrameworkTab.value === 'angular' ? 'bg-slate-900 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-100'
            }`,
            onClick: () => { activeFrameworkTab.value = 'angular'; }
          }, 'Angular 17+')
        )
      );
      codeCard.appendChild(codeHeader);

      // Code Display Container
      const codeBody = el('div', { class: 'bg-slate-950 p-6 text-slate-100 font-mono text-xs overflow-x-auto relative' });

      // Copy Button
      const copyBtn = el('button', {
        type: 'button',
        class: 'absolute top-4 right-4 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-mono border border-slate-700 transition flex items-center space-x-1.5 cursor-pointer',
        onClick: () => {
          const currentCode =
            activeFrameworkTab.value === 'samrey'
              ? selectedFeature.value.samreyCode
              : activeFrameworkTab.value === 'react'
              ? selectedFeature.value.reactCode
              : activeFrameworkTab.value === 'vue'
              ? selectedFeature.value.vueCode
              : selectedFeature.value.angularCode;

          if (navigator.clipboard) {
            navigator.clipboard.writeText(currentCode);
            copiedStatus.value = true;
            setTimeout(() => { copiedStatus.value = false; }, 2000);
          }
        }
      },
        icon('copy', 'w-3.5 h-3.5'),
        el('span', null, () => copiedStatus.value ? 'Copied!' : 'Copy Code')
      );
      codeBody.appendChild(copyBtn);

      const pre = el('pre', { class: 'leading-relaxed whitespace-pre' },
        el('code', null, () => {
          const tab = activeFrameworkTab.value;
          if (tab === 'samrey') return selectedFeature.value.samreyCode;
          if (tab === 'react') return selectedFeature.value.reactCode;
          if (tab === 'vue') return selectedFeature.value.vueCode;
          return selectedFeature.value.angularCode;
        })
      );
      codeBody.appendChild(pre);
      codeCard.appendChild(codeBody);

      // Key Architectural Takeaways Footer
      const takeawaysFooter = el('div', { class: 'p-5 bg-slate-50 border-t border-slate-200 space-y-2' },
        el('div', { class: 'flex items-center space-x-2 text-xs font-bold text-slate-800 uppercase tracking-wider' },
          icon('check-circle', 'w-4 h-4 text-emerald-600'),
          el('span', null, 'Architectural Takeaways & Execution Differences')
        ),
        el('ul', { class: 'space-y-1.5' },
          () => {
            const list = el('div', { class: 'space-y-1.5' });
            for (const diff of selectedFeature.value.keyDifferences) {
              list.appendChild(el('li', { class: 'flex items-start space-x-2 text-xs text-slate-700' },
                el('span', { class: 'w-1.5 h-1.5 rounded-full bg-cyan-600 mt-1.5 shrink-0' }),
                el('span', null, diff)
              ));
            }
            return list;
          }
        )
      );
      codeCard.appendChild(takeawaysFooter);

      container.appendChild(codeCard);
      return container;
    }
  });
  root.appendChild(codeView);

  // -------------------------------------------------------------
  // VIEW 3: 22-DIMENSION TAXONOMY & EXPLORER
  // -------------------------------------------------------------
  const dimensionsView = Show({
    when: () => viewMode.value === 'dimensions',
    children: () => {
      const container = el('div', { class: 'space-y-6' });

      // Filter & Search Controls
      const controlsCard = el('div', { class: 'bg-white rounded-2xl border border-slate-200 p-4 shadow-xs space-y-4' });
      const controlsFlex = el('div', { class: 'flex flex-col sm:flex-row sm:items-center justify-between gap-3' });

      // Search Input
      const searchWrapper = el('div', { class: 'relative flex-1' },
        el('div', { class: 'absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400' },
          icon('search', 'w-4 h-4')
        )
      );

      const searchInput = el('input', {
        type: 'text',
        id: 'competitive-search-input',
        placeholder: 'Search 22 architectural dimensions, framework trade-offs, or solutions...',
        class: 'w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:bg-white transition'
      });
      searchInput.addEventListener('input', (e) => {
        searchQuery.value = (e.target as HTMLInputElement).value;
      });
      searchWrapper.appendChild(searchInput);
      controlsFlex.appendChild(searchWrapper);

      // Result Counter
      const countBadge = el('div', { class: 'text-xs font-mono text-slate-500 whitespace-nowrap' },
        () => `Showing ${filteredDimensions.value.length} of ${DIMENSIONS.length} dimensions`
      );
      controlsFlex.appendChild(countBadge);
      controlsCard.appendChild(controlsFlex);

      // Category Badges
      const categoryScroll = el('div', { class: 'flex items-center space-x-1.5 overflow-x-auto pb-1 scrollbar-none' });
      const allBtn = el('button', {
        type: 'button',
        class: () => `px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer ${
          selectedCategory.value === 'ALL'
            ? 'bg-slate-900 text-white shadow-xs'
            : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
        }`,
        onClick: () => {
          selectedCategory.value = 'ALL';
        }
      }, 'All Categories');
      categoryScroll.appendChild(allBtn);

      for (const cat of Object.values(CATEGORIES)) {
        const catBtn = el('button', {
          type: 'button',
          class: () => `px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer flex items-center space-x-1.5 ${
            selectedCategory.value === cat.code
              ? 'bg-slate-900 text-white shadow-xs'
              : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
          }`,
          onClick: () => {
            selectedCategory.value = cat.code;
          }
        },
          el('span', { class: 'font-mono font-bold' }, `[${cat.code}]`),
          el('span', null, cat.label)
        );
        categoryScroll.appendChild(catBtn);
      }
      controlsCard.appendChild(categoryScroll);
      container.appendChild(controlsCard);

      // Two Column Split: Left Dimension List, Right Detailed Matrix
      const splitGrid = el('div', { class: 'grid grid-cols-1 lg:grid-cols-12 gap-6' });

      // Left List (4 cols)
      const leftCol = el('div', { class: 'lg:col-span-4 space-y-2' },
        el('span', { class: 'text-xs font-bold uppercase tracking-wider text-slate-500 px-1' },
          () => `Dimensions (${filteredDimensions.value.length})`
        )
      );

      const dimensionListContainer = el('div', { class: 'space-y-1.5 max-h-[720px] overflow-y-auto pr-1' });
      const dimList = For({
        each: () => filteredDimensions.value,
        key: (item) => item.id,
        fallback: () => el('div', { class: 'p-6 text-center text-slate-500 bg-white rounded-xl border border-slate-200 text-xs' },
          'No dimensions matching current query.'
        ),
        children: (item) => {
          const itemCard = el('div', {
            id: `dim-card-${item.id}`,
            class: () => {
              const isSelected = activeDimension.value?.id === item.id;
              return `p-3.5 rounded-xl border transition-all cursor-pointer ${
                isSelected
                  ? 'bg-slate-900 text-white border-slate-900 shadow-md ring-1 ring-slate-900'
                  : 'bg-white text-slate-800 border-slate-200 hover:border-slate-300 hover:bg-slate-50'
              }`;
            },
            onClick: () => {
              activeDimension.value = item;
            }
          },
            el('div', { class: 'flex items-center justify-between' },
              el('span', { class: 'font-bold text-xs' }, item.dimension),
              icon('arrow-right', 'w-3.5 h-3.5 opacity-60')
            ),
            el('p', {
              class: () => `text-xs mt-1.5 line-clamp-2 ${activeDimension.value?.id === item.id ? 'text-slate-300' : 'text-slate-500'}`
            }, item.samrey.summary)
          );
          return itemCard;
        }
      });
      dimensionListContainer.appendChild(dimList);
      leftCol.appendChild(dimensionListContainer);
      splitGrid.appendChild(leftCol);

      // Right Detail View (8 cols)
      const rightCol = el('div', { class: 'lg:col-span-8' });
      const detailView = Show({
        when: () => activeDimension.value,
        fallback: () => el('div', { class: 'p-12 text-center text-slate-400 bg-white rounded-2xl border border-slate-200' },
          'Select a dimension from the left to view in-depth comparison.'
        ),
        children: (dim) => {
          const detContainer = el('div', { class: 'bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-xs space-y-6' });

          // Title & Dimension Header
          const header = el('div', { class: 'pb-4 border-b border-slate-100' },
            el('div', { class: 'flex items-center space-x-2 text-xs font-mono text-cyan-600 mb-1' },
              icon('cpu', 'w-3.5 h-3.5'),
              el('span', null, `DIMENSION ID: ${dim.id}`)
            ),
            el('h3', { class: 'text-2xl font-bold text-slate-900' }, dim.dimension)
          );
          detContainer.appendChild(header);

          // Samrey Architectural Solution Card (Highlighted)
          const aetherCard = el('div', { class: 'p-5 rounded-xl bg-slate-900 text-white border border-slate-800 shadow-sm space-y-2' },
            el('div', { class: 'flex items-center space-x-2' },
              el('span', { class: 'px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-mono font-bold' },
                'SAMREY ARCHITECTURE'
              ),
              el('span', { class: 'text-xs font-semibold text-slate-200' }, dim.samrey.summary)
            ),
            el('p', { class: 'text-xs text-slate-300 leading-relaxed font-sans mt-2' },
              dim.samrey.architecturalSolution
            )
          );
          detContainer.appendChild(aetherCard);

          // Competitor Matrix (5 Competitors)
          const compTitle = el('h4', { class: 'text-xs font-bold uppercase tracking-wider text-slate-500 pt-2' },
            'Ecosystem Comparison & Classifications'
          );
          detContainer.appendChild(compTitle);

          const competitorGrid = el('div', { class: 'grid grid-cols-1 md:grid-cols-2 gap-3' });
          const competitors: { name: string; badge: string; data: { summary: string; category?: string; details: string } }[] = [
            { name: 'React', badge: 'VDOM / Fiber', data: dim.react },
            { name: 'Angular', badge: 'Signals / Zone.js', data: dim.angular },
            { name: 'Vue 3', badge: 'Proxy Reactivity', data: dim.vue },
            { name: 'Svelte 5', badge: 'Runes / Compiler', data: dim.svelte },
            { name: 'Solid.js', badge: 'Fine-Grained Signals', data: dim.solid }
          ];

          for (const comp of competitors) {
            const cCard = el('div', { class: 'p-4 rounded-xl border border-slate-200 bg-slate-50/70 space-y-2' },
              el('div', { class: 'flex items-center justify-between' },
                el('div', { class: 'flex items-center space-x-1.5' },
                  el('span', { class: 'font-bold text-xs text-slate-900' }, comp.name),
                  el('span', { class: 'text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-200 text-slate-700' }, comp.badge)
                ),
                comp.data.category ? el('span', {
                  class: 'text-[10px] font-mono px-2 py-0.5 rounded-full font-bold bg-amber-100 text-amber-800 border border-amber-200'
                }, `[${comp.data.category}]`) : null
              ),
              el('p', { class: 'text-xs font-medium text-slate-800' }, comp.data.summary),
              el('p', { class: 'text-xs text-slate-600 leading-relaxed' }, comp.data.details)
            );
            competitorGrid.appendChild(cCard);
          }
          detContainer.appendChild(competitorGrid);

          return detContainer;
        }
      });
      rightCol.appendChild(detailView);
      splitGrid.appendChild(rightCol);
      container.appendChild(splitGrid);

      return container;
    }
  });
  root.appendChild(dimensionsView);

  return root;
}
