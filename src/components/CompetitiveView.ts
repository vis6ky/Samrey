/**
 * @license Apache-2.0
 * @samrey/doc - Native Samrey Competitive Analysis View
 */

import { el, Show, For } from '@samrey/runtime';
import { signal, computed } from '@samrey/reactivity';
import { CATEGORIES, DIMENSIONS } from '../data/competitiveData.js';
import { DimensionItem } from '../types.js';
import { icon } from '../lib/icons.js';

export function CompetitiveView(): HTMLElement {
  const selectedCategory = signal<string>('ALL');
  const searchQuery = signal<string>('');
  const activeDimension = signal<DimensionItem | null>(DIMENSIONS[0]);

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
        item.aether.summary.toLowerCase().includes(query);

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

  // Overview Banner
  const banner = el('div', { class: 'bg-slate-900 text-white rounded-2xl p-6 shadow-sm border border-slate-800' },
    el('div', { class: 'flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4' },
      el('div', null,
        el('div', { class: 'inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-slate-800 text-slate-300 text-xs font-mono mb-2' },
          icon('cpu', 'w-3.5 h-3.5 text-cyan-400'),
          el('span', null, '22-Dimension Comparative Taxonomy')
        ),
        el('h2', { class: 'text-2xl font-bold tracking-tight text-white' },
          'Competitive Technical Evaluation'
        ),
        el('p', { class: 'text-slate-400 text-sm mt-1 max-w-3xl' },
          'Rigorous comparative analysis of React, Angular, Vue, Svelte, and Solid. Every design tradeoff is categorized strictly into standard architectural classifications without conflating normal framework behaviors with security vulnerabilities.'
        )
      ),
      el('div', { class: 'flex flex-wrap gap-2 text-xs font-mono' },
        el('div', { class: 'px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-300' },
          el('span', { class: 'text-emerald-400 font-bold' }, '5'), ' Competitors'
        ),
        el('div', { class: 'px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-300' },
          el('span', { class: 'text-cyan-400 font-bold' }, '22'), ' Dimensions'
        ),
        el('div', { class: 'px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-300' },
          el('span', { class: 'text-amber-400 font-bold' }, '6'), ' Categories'
        )
      )
    )
  );
  root.appendChild(banner);

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
  root.appendChild(controlsCard);

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
        }, item.aether.summary)
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
      const container = el('div', { class: 'bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-xs space-y-6' });

      // Title & Dimension Header
      const header = el('div', { class: 'pb-4 border-b border-slate-100' },
        el('div', { class: 'flex items-center space-x-2 text-xs font-mono text-cyan-600 mb-1' },
          icon('cpu', 'w-3.5 h-3.5'),
          el('span', null, `DIMENSION ID: ${dim.id}`)
        ),
        el('h3', { class: 'text-2xl font-bold text-slate-900' }, dim.dimension)
      );
      container.appendChild(header);

      // Samrey Architectural Solution Card (Highlighted)
      const aetherCard = el('div', { class: 'p-5 rounded-xl bg-slate-900 text-white border border-slate-800 shadow-sm space-y-2' },
        el('div', { class: 'flex items-center space-x-2' },
          el('span', { class: 'px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-mono font-bold' },
            'AETHER ARCHITECTURE'
          ),
          el('span', { class: 'text-xs font-semibold text-slate-200' }, dim.aether.summary)
        ),
        el('p', { class: 'text-xs text-slate-300 leading-relaxed font-sans mt-2' },
          dim.aether.architecturalSolution
        )
      );
      container.appendChild(aetherCard);

      // Competitor Matrix (5 Competitors)
      const compTitle = el('h4', { class: 'text-xs font-bold uppercase tracking-wider text-slate-500 pt-2' },
        'Ecosystem Comparison & Classifications'
      );
      container.appendChild(compTitle);

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

      container.appendChild(competitorGrid);
      return container;
    }
  });

  rightCol.appendChild(detailView);
  splitGrid.appendChild(rightCol);

  root.appendChild(splitGrid);
  return root;
}
