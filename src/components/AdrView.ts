/**
 * @license Apache-2.0
 * @gati/doc - Native Gati ADR View
 */

import { el, For } from '@gati/runtime';
import { signal } from '@gati/reactivity';
import { ARCHITECTURE_DECISION_RECORDS } from '../data/adrData.js';
import { ADR } from '../types.js';
import { icon } from '../lib/icons.js';

export function AdrView(): HTMLElement {
  const activeAdr = signal<ADR>(ARCHITECTURE_DECISION_RECORDS[0]);

  const root = el('div', { class: 'space-y-6' });

  // Banner
  const banner = el('div', { class: 'bg-slate-900 text-white rounded-2xl p-6 border border-slate-800 shadow-sm' },
    el('div', { class: 'flex flex-col lg:flex-row lg:items-center justify-between gap-4' },
      el('div', null,
        el('div', { class: 'inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-slate-800 text-amber-300 text-xs font-mono mb-2' },
          icon('git-pull-request', 'w-3.5 h-3.5'),
          el('span', null, 'Architectural Decision Records (ADRs)')
        ),
        el('h2', { class: 'text-2xl font-bold tracking-tight' },
          'Design Justifications & Technical Tradeoffs'
        ),
        el('p', { class: 'text-slate-400 text-sm mt-1 max-w-3xl' },
          'Formal records capturing the technical context, explicit architectural choices, pros, cons, and alternatives considered during the design of Gati.'
        )
      ),
      el('div', { class: 'flex items-center space-x-2 text-xs font-mono bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-700 text-slate-300' },
        el('span', { class: 'text-emerald-400 font-bold' }, '8'), ' Records Accepted'
      )
    )
  );
  root.appendChild(banner);

  // Split View
  const splitGrid = el('div', { class: 'grid grid-cols-1 lg:grid-cols-12 gap-6' });

  // Left ADR List (4 cols)
  const leftCol = el('div', { class: 'lg:col-span-4 space-y-2' },
    el('span', { class: 'text-xs font-bold uppercase tracking-wider text-slate-500 px-1' },
      `Decision Index (${ARCHITECTURE_DECISION_RECORDS.length})`
    )
  );

  const adrListContainer = el('div', { class: 'space-y-1.5 max-h-[680px] overflow-y-auto pr-1' });

  const adrItems = For({
    each: () => ARCHITECTURE_DECISION_RECORDS,
    key: (a) => a.id,
    children: (adr) => {
      const item = el('div', {
        id: `adr-item-${adr.id}`,
        class: () => {
          const isSelected = activeAdr.value.id === adr.id;
          return `p-3.5 rounded-xl border transition-all cursor-pointer ${
            isSelected
              ? 'bg-slate-900 text-white border-slate-900 shadow-md ring-1 ring-slate-900'
              : 'bg-white text-slate-800 border-slate-200 hover:border-slate-300 hover:bg-slate-50'
          }`;
        },
        onClick: () => {
          activeAdr.value = adr;
        }
      },
        el('div', { class: 'flex items-center justify-between' },
          el('span', { class: 'font-mono text-xs font-bold' }, adr.id),
          el('span', {
            class: () => `text-[10px] font-mono px-2 py-0.5 rounded font-semibold ${
              activeAdr.value.id === adr.id ? 'bg-emerald-800 text-emerald-100' : 'bg-emerald-100 text-emerald-800'
            }`
          }, adr.status)
        ),
        el('h4', { class: 'text-xs font-semibold mt-1 line-clamp-2' }, adr.title),
        el('span', {
          class: () => `text-[10px] block mt-1 ${activeAdr.value.id === adr.id ? 'text-slate-400' : 'text-slate-500'}`
        }, adr.category)
      );
      return item;
    }
  });

  adrListContainer.appendChild(adrItems);
  leftCol.appendChild(adrListContainer);
  splitGrid.appendChild(leftCol);

  // Right Detail (8 cols)
  const rightCol = el('div', { class: 'lg:col-span-8 bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-6' },
    el('div', { class: 'flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-slate-100' },
      el('div', null,
        el('div', { class: 'flex items-center space-x-2' },
          el('span', { class: 'text-xs font-mono font-bold px-2 py-0.5 rounded bg-slate-900 text-white' },
            () => activeAdr.value.id
          ),
          el('span', { class: 'text-xs font-mono text-slate-500' },
            () => activeAdr.value.category
          )
        ),
        el('h3', { class: 'text-xl font-bold text-slate-900 mt-2' },
          () => activeAdr.value.title
        )
      ),
      el('span', { class: 'text-xs px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 font-semibold border border-emerald-200 self-start' },
        () => `Status: ${activeAdr.value.status}`
      )
    ),

    // 1. Context
    el('div', { class: 'space-y-2' },
      el('span', { class: 'text-xs font-bold uppercase tracking-wider text-slate-500' }, '1. Context & Problem Statement'),
      el('div', { class: 'p-4 rounded-xl bg-slate-50 border border-slate-200 text-sm text-slate-700 leading-relaxed' },
        () => activeAdr.value.context
      )
    ),

    // 2. Decision
    el('div', { class: 'space-y-2' },
      el('span', { class: 'text-xs font-bold uppercase tracking-wider text-slate-500' }, '2. Architectural Decision'),
      el('div', { class: 'p-4 rounded-xl bg-slate-900 text-white border border-slate-800 text-sm leading-relaxed' },
        () => activeAdr.value.decision
      )
    ),

    // 3. Tradeoffs & Consequences
    el('div', { class: 'space-y-2' },
      el('span', { class: 'text-xs font-bold uppercase tracking-wider text-slate-500' }, '3. Tradeoffs & Consequences'),
      el('div', { class: 'grid grid-cols-1 md:grid-cols-2 gap-4' },
        // Positive
        el('div', { class: 'p-4 rounded-xl bg-emerald-50/70 border border-emerald-200 space-y-2' },
          el('div', { class: 'flex items-center space-x-1.5 text-xs font-bold text-emerald-900' },
            icon('check-circle', 'w-4 h-4 text-emerald-600'),
            el('span', null, 'Positive Impacts')
          ),
          el('ul', { class: 'space-y-1.5' },
            () => {
              const wrapper = el('div', { class: 'space-y-1.5' });
              for (const pos of activeAdr.value.consequences.positive) {
                wrapper.appendChild(el('li', { class: 'text-xs text-emerald-950 flex items-start space-x-1.5' },
                  el('span', { class: 'font-bold text-emerald-600' }, '•'),
                  el('span', null, pos)
                ));
              }
              return wrapper;
            }
          )
        ),
        // Negative
        el('div', { class: 'p-4 rounded-xl bg-amber-50/70 border border-amber-200 space-y-2' },
          el('div', { class: 'flex items-center space-x-1.5 text-xs font-bold text-amber-900' },
            icon('alert-octagon', 'w-4 h-4 text-amber-600'),
            el('span', null, 'Negative Tradeoffs / Mitigations')
          ),
          el('ul', { class: 'space-y-1.5' },
            () => {
              const wrapper = el('div', { class: 'space-y-1.5' });
              for (const neg of activeAdr.value.consequences.negative) {
                wrapper.appendChild(el('li', { class: 'text-xs text-amber-950 flex items-start space-x-1.5' },
                  el('span', { class: 'font-bold text-amber-600' }, '•'),
                  el('span', null, neg)
                ));
              }
              return wrapper;
            }
          )
        )
      )
    ),

    // 4. Rejected Alternatives
    el('div', { class: 'space-y-2' },
      el('span', { class: 'text-xs font-bold uppercase tracking-wider text-slate-500' }, '4. Rejected Alternatives'),
      el('div', { class: 'flex flex-wrap gap-2' },
        () => {
          const wrapper = el('div', { class: 'flex flex-wrap gap-2' });
          for (const alt of activeAdr.value.alternatives) {
            wrapper.appendChild(el('span', { class: 'text-xs font-mono px-3 py-1 rounded-lg bg-slate-100 text-slate-700 border border-slate-200' },
              `✕ ${alt}`
            ));
          }
          return wrapper;
        }
      )
    )
  );

  splitGrid.appendChild(rightCol);
  root.appendChild(splitGrid);

  return root;
}
