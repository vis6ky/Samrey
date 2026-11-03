/**
 * @license Apache-2.0
 * @samrey/doc - Native Samrey Architecture & Monorepo Packages Explorer
 */

import { el, For } from '@samrey/runtime';
import { signal } from '@samrey/reactivity';
import { FRAMEWORK_PACKAGES } from '../data/packagesData.js';
import { FrameworkPackage } from '../types.js';
import { icon } from '../lib/icons.js';

export function ArchitectureView(): HTMLElement {
  const selectedPackage = signal<FrameworkPackage>(FRAMEWORK_PACKAGES[0]);

  const root = el('div', { class: 'space-y-6' });

  // Banner
  const banner = el('div', { class: 'bg-slate-900 text-white rounded-2xl p-6 border border-slate-800 shadow-sm' },
    el('div', { class: 'flex flex-col lg:flex-row lg:items-center justify-between gap-4' },
      el('div', null,
        el('div', { class: 'inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-slate-800 text-purple-300 text-xs font-mono mb-2' },
          icon('cpu', 'w-3.5 h-3.5'),
          el('span', null, 'Acyclic Monorepo Topology')
        ),
        el('h2', { class: 'text-2xl font-bold tracking-tight' },
          'Samrey Monorepo & Package Architecture'
        ),
        el('p', { class: 'text-slate-400 text-sm mt-1 max-w-3xl' },
          '12 cohesive, tree-shakeable packages. Foundational reactivity and security primitives have zero dependencies, ensuring strict architectural isolation and minimal bundle footprints.'
        )
      ),
      el('div', { class: 'flex flex-wrap gap-2 text-xs font-mono' },
        el('div', { class: 'px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-300' },
          el('span', { class: 'text-emerald-400 font-bold' }, '12'), ' Packages'
        ),
        el('div', { class: 'px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-300' },
          el('span', { class: 'text-cyan-400 font-bold' }, '< 7 kB'), ' Core Runtime'
        ),
        el('div', { class: 'px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-300' },
          el('span', { class: 'text-purple-400 font-bold' }, '100%'), ' Type-Safe'
        )
      )
    )
  );
  root.appendChild(banner);

  // Split Explorer
  const splitGrid = el('div', { class: 'grid grid-cols-1 lg:grid-cols-12 gap-6' });

  // Left Package List (4 cols)
  const leftCol = el('div', { class: 'lg:col-span-4 space-y-2' },
    el('span', { class: 'text-xs font-bold uppercase tracking-wider text-slate-500 px-1' },
      `Monorepo Packages (${FRAMEWORK_PACKAGES.length})`
    )
  );

  const pkgListContainer = el('div', { class: 'space-y-1.5 max-h-[680px] overflow-y-auto pr-1' });

  const pkgItems = For({
    each: () => FRAMEWORK_PACKAGES,
    key: (p) => p.name,
    children: (pkg) => {
      const item = el('div', {
        id: `pkg-item-${pkg.name.replace('@', '').replace('/', '-')}`,
        class: () => {
          const isSelected = selectedPackage.value.name === pkg.name;
          return `p-3.5 rounded-xl border transition-all cursor-pointer ${
            isSelected
              ? 'bg-slate-900 text-white border-slate-900 shadow-md ring-1 ring-slate-900'
              : 'bg-white text-slate-800 border-slate-200 hover:border-slate-300 hover:bg-slate-50'
          }`;
        },
        onClick: () => {
          selectedPackage.value = pkg;
        }
      },
        el('div', { class: 'flex items-center justify-between' },
          el('span', { class: 'font-mono text-xs font-bold' }, pkg.name),
          el('span', {
            class: () => `text-[10px] font-mono px-2 py-0.5 rounded font-semibold ${
              selectedPackage.value.name === pkg.name ? 'bg-slate-800 text-cyan-300' : 'bg-slate-100 text-slate-600'
            }`
          }, pkg.bundleBudget)
        ),
        el('p', {
          class: () => `text-xs mt-1 line-clamp-1 ${selectedPackage.value.name === pkg.name ? 'text-slate-300' : 'text-slate-500'}`
        }, pkg.scope)
      );
      return item;
    }
  });

  pkgListContainer.appendChild(pkgItems);
  leftCol.appendChild(pkgListContainer);
  splitGrid.appendChild(leftCol);

  // Right Detail (8 cols)
  const rightCol = el('div', { class: 'lg:col-span-8 bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-6' },
    el('div', { class: 'flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-slate-100' },
      el('div', null,
        el('span', { class: 'text-xs font-mono font-bold px-2.5 py-1 rounded bg-slate-100 text-slate-700 border border-slate-200' },
          () => selectedPackage.value.scope
        ),
        el('h3', { class: 'text-xl font-bold font-mono text-slate-900 mt-2' },
          () => selectedPackage.value.name
        )
      ),
      el('div', { class: 'flex items-center space-x-2 text-xs font-mono text-slate-700 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200' },
        icon('hard-drive', 'w-3.5 h-3.5 text-slate-500'),
        el('span', null, 'Target Budget: '),
        el('strong', null, () => selectedPackage.value.bundleBudget)
      )
    ),

    el('p', { class: 'text-sm text-slate-700 leading-relaxed' },
      () => selectedPackage.value.description
    ),

    // Dependencies & Exports Grid
    el('div', { class: 'grid grid-cols-1 md:grid-cols-2 gap-4' },
      // Dependencies
      el('div', { class: 'p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2' },
        el('div', { class: 'flex items-center space-x-1.5 text-xs font-bold text-slate-800 uppercase tracking-wider' },
          icon('git-branch', 'w-3.5 h-3.5 text-slate-500'),
          el('span', null, 'Internal Dependencies')
        ),
        el('div', null,
          () => {
            const deps = selectedPackage.value.dependencies;
            if (deps.length === 0) {
              return el('p', { class: 'text-xs text-emerald-600 font-mono font-semibold' },
                'Zero internal dependencies (Root Leaf)'
              );
            }
            const wrapper = el('div', { class: 'flex flex-wrap gap-1.5' });
            for (const dep of deps) {
              wrapper.appendChild(el('span', { class: 'text-xs font-mono px-2 py-0.5 rounded bg-white text-slate-800 border border-slate-200 shadow-2xs' }, dep));
            }
            return wrapper;
          }
        )
      ),

      // Exports
      el('div', { class: 'p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2' },
        el('div', { class: 'flex items-center space-x-1.5 text-xs font-bold text-slate-800 uppercase tracking-wider' },
          icon('box', 'w-3.5 h-3.5 text-slate-500'),
          el('span', null, 'Primary Exports')
        ),
        el('div', null,
          () => {
            const exps = selectedPackage.value.keyExports;
            const wrapper = el('div', { class: 'flex flex-wrap gap-1.5' });
            for (const exp of exps) {
              wrapper.appendChild(el('span', { class: 'text-xs font-mono px-2 py-0.5 rounded bg-white text-slate-800 border border-slate-200 shadow-2xs' }, exp));
            }
            return wrapper;
          }
        )
      )
    ),

    // Responsibilities List
    el('div', { class: 'space-y-2' },
      el('span', { class: 'text-xs font-bold uppercase tracking-wider text-slate-500' },
        'Core Architectural Responsibilities'
      ),
      el('ul', { class: 'space-y-1.5' },
        () => {
          const listWrapper = el('div', { class: 'space-y-1.5' });
          for (const resp of selectedPackage.value.responsibilities) {
            listWrapper.appendChild(el('li', { class: 'flex items-start space-x-2 text-xs text-slate-700' },
              el('span', { class: 'w-1.5 h-1.5 rounded-full bg-slate-900 mt-1.5 shrink-0' }),
              el('span', null, resp)
            ));
          }
          return listWrapper;
        }
      )
    ),

    // Security Boundary
    el('div', { class: 'p-4 rounded-xl bg-cyan-50/70 border border-cyan-200 space-y-1.5' },
      el('div', { class: 'flex items-center space-x-2 text-xs font-bold text-cyan-900' },
        icon('shield-check', 'w-4 h-4 text-cyan-700'),
        el('span', null, 'Security & Isolation Boundary')
      ),
      el('p', { class: 'text-xs text-cyan-950 leading-relaxed' },
        () => selectedPackage.value.securityBoundary
      )
    )
  );

  splitGrid.appendChild(rightCol);
  root.appendChild(splitGrid);

  return root;
}
