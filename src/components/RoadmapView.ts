/**
 * @license Apache-2.0
 * @aether/doc - Native Aether Phased Roadmap View
 */

import { el, For } from '@aether/runtime';
import { ROADMAP_PHASES, DEFERRED_FEATURES } from '../data/roadmapData.js';
import { icon } from '../lib/icons.js';

export function RoadmapView(): HTMLElement {
  const root = el('div', { class: 'space-y-6' });

  // Banner
  const banner = el('div', { class: 'bg-slate-900 text-white rounded-2xl p-6 border border-slate-800 shadow-sm' },
    el('div', { class: 'flex flex-col lg:flex-row lg:items-center justify-between gap-4' },
      el('div', null,
        el('div', { class: 'inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-slate-800 text-emerald-400 text-xs font-mono mb-2' },
          icon('milestone', 'w-3.5 h-3.5'),
          el('span', null, 'Gate-Checked Phased Implementation Plan')
        ),
        el('h2', { class: 'text-2xl font-bold tracking-tight' },
          'Development Roadmap & Explicit Non-Goals'
        ),
        el('p', { class: 'text-slate-400 text-sm mt-1 max-w-3xl' },
          'Strict multi-phase progression. Phase 1 will not commence until architectural consistency is certified. To maintain architectural purity and avoid premature bloat, unnecessary features are explicitly deferred.'
        )
      ),
      el('div', { class: 'flex items-center space-x-2 text-xs font-mono bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-700 text-slate-300' },
        el('span', { class: 'w-2 h-2 rounded-full bg-emerald-400' }),
        el('span', null, 'Phase 0: Signed Off')
      )
    )
  );
  root.appendChild(banner);

  // Deferred Features Box
  const deferredBox = el('div', { class: 'bg-amber-50/80 border-2 border-amber-300 rounded-2xl p-6 shadow-xs space-y-4' },
    el('div', { class: 'flex items-center space-x-2 text-amber-900 font-bold text-base' },
      icon('ban', 'w-5 h-5 text-amber-700'),
      el('span', null, 'Explicitly Deferred Features & Architectural Non-Goals')
    ),
    el('p', { class: 'text-xs text-amber-900/80 leading-relaxed max-w-4xl' },
      'The following features are strictly excluded from initial milestones to avoid introducing premature complexity, runtime performance degradation, or security attack surfaces:'
    )
  );

  const deferredGrid = el('div', { class: 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3' });
  const deferredItems = For({
    each: () => DEFERRED_FEATURES,
    key: (d) => d.feature,
    children: (item) => el('div', { class: 'p-4 rounded-xl bg-white border border-amber-200 shadow-2xs space-y-2' },
      el('div', { class: 'flex items-center space-x-1.5 text-xs font-bold text-slate-900' },
        el('span', { class: 'text-red-600 font-mono' }, '✕'),
        el('span', null, item.feature)
      ),
      el('p', { class: 'text-xs text-slate-600 leading-relaxed' },
        el('strong', null, 'Why Deferred: '),
        el('span', null, item.reason)
      ),
      el('div', { class: 'text-[11px] font-mono text-emerald-800 bg-emerald-50 px-2 py-1 rounded border border-emerald-200' },
        el('strong', null, 'Alternative: '),
        el('span', null, item.alternative)
      )
    )
  });
  deferredGrid.appendChild(deferredItems);
  deferredBox.appendChild(deferredGrid);
  root.appendChild(deferredBox);

  // Phased Roadmap Section
  const phaseSection = el('div', { class: 'space-y-4' },
    el('h3', { class: 'text-sm font-bold uppercase tracking-wider text-slate-500 px-1' },
      'Implementation Phases (0 to 7)'
    )
  );

  const phaseList = el('div', { class: 'space-y-4' });
  const phaseItems = For({
    each: () => ROADMAP_PHASES,
    key: (p) => p.phaseNumber,
    children: (phase) => {
      const isCompleted = phase.status === 'Completed';
      const isReady = phase.status === 'Ready to Start';

      const card = el('div', {
        id: `roadmap-phase-${phase.phaseNumber}`,
        class: `p-5 rounded-2xl border transition-all ${
          isCompleted
            ? 'bg-white border-emerald-300 shadow-xs'
            : isReady
            ? 'bg-white border-slate-900 ring-1 ring-slate-900 shadow-sm'
            : 'bg-slate-50/70 border-slate-200'
        }`
      },
        el('div', { class: 'flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100' },
          el('div', { class: 'flex items-center space-x-3' },
            el('span', {
              class: `w-8 h-8 rounded-lg flex items-center justify-center font-mono font-bold text-sm ${
                isCompleted
                  ? 'bg-emerald-600 text-white'
                  : isReady
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-200 text-slate-700'
              }`
            }, `P${phase.phaseNumber}`),
            el('div', null,
              el('h4', { class: 'font-bold text-slate-900 text-sm' }, phase.name),
              el('span', { class: 'text-xs text-slate-500 font-mono' }, `Target: ${phase.duration}`)
            )
          ),
          el('span', {
            class: `text-xs px-3 py-1 rounded-full font-mono font-semibold self-start sm:self-auto border ${
              isCompleted
                ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                : isReady
                ? 'bg-slate-900 text-white border-slate-900'
                : 'bg-slate-100 text-slate-600 border-slate-200'
            }`
          }, phase.status)
        ),
        el('div', { class: 'grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 text-xs' },
          // Objectives
          el('div', { class: 'space-y-1.5' },
            el('span', { class: 'font-bold uppercase tracking-wider text-slate-500 text-[10px]' }, 'Key Objectives'),
            (() => {
              const ul = el('ul', { class: 'space-y-1' });
              for (const obj of phase.objectives) {
                ul.appendChild(el('li', { class: 'flex items-start space-x-1.5 text-slate-700' },
                  el('span', { class: 'text-slate-400' }, '•'),
                  el('span', null, obj)
                ));
              }
              return ul;
            })()
          ),
          // Verification Gate
          el('div', { class: 'space-y-1.5 p-3 rounded-xl bg-slate-50 border border-slate-200' },
            el('span', { class: 'font-bold uppercase tracking-wider text-emerald-800 text-[10px] flex items-center space-x-1' },
              icon('shield-check', 'w-3.5 h-3.5 text-emerald-600'),
              el('span', null, 'Phase Verification Gate')
            ),
            (() => {
              const ul = el('ul', { class: 'space-y-1' });
              for (const gate of phase.verificationGate) {
                ul.appendChild(el('li', { class: 'flex items-start space-x-1.5 text-slate-700' },
                  icon('check-circle', 'w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5'),
                  el('span', null, gate)
                ));
              }
              return ul;
            })()
          )
        )
      );

      return card;
    }
  });

  phaseList.appendChild(phaseItems);
  phaseSection.appendChild(phaseList);
  root.appendChild(phaseSection);

  return root;
}
