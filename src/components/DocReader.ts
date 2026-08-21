/**
 * @license Apache-2.0
 * @aether/doc - Native Aether Documentation Reader
 */

import { el, For } from '@aether/runtime';
import { signal } from '@aether/reactivity';
import { DOCS_REGISTRY, DocEntry } from '../data/docContents.js';
import { renderMarkdownToAetherDOM } from '../lib/markdown.js';
import { icon } from '../lib/icons.js';

export function DocReader(): HTMLElement {
  const selectedDoc = signal<DocEntry>(DOCS_REGISTRY[0]);
  const copied = signal<boolean>(false);

  const handleCopy = () => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(selectedDoc.value.content);
      copied.value = true;
      setTimeout(() => {
        copied.value = false;
      }, 2000);
    }
  };

  const handleDownload = () => {
    const blob = new Blob([selectedDoc.value.content], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = selectedDoc.value.filename.split('/').pop() || 'document.md';
    a.click();
    URL.revokeObjectURL(url);
  };

  const root = el('div', { class: 'space-y-6' });

  // Banner
  const banner = el('div', { class: 'bg-slate-900 text-white rounded-2xl p-6 border border-slate-800 shadow-sm' },
    el('div', { class: 'flex flex-col lg:flex-row lg:items-center justify-between gap-4' },
      el('div', null,
        el('div', { class: 'inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-slate-800 text-cyan-300 text-xs font-mono mb-2' },
          icon('book-open', 'w-3.5 h-3.5'),
          el('span', null, 'Full Specification Documents')
        ),
        el('h2', { class: 'text-2xl font-bold tracking-tight' },
          'Aether Architectural Documentation Suite'
        ),
        el('p', { class: 'text-slate-400 text-sm mt-1 max-w-3xl' },
          'Inspect and export the complete markdown technical specifications generated in the ',
          el('code', { class: 'text-cyan-300 font-mono' }, 'docs/'),
          ' directory.'
        )
      )
    )
  );
  root.appendChild(banner);

  // Split View
  const splitGrid = el('div', { class: 'grid grid-cols-1 lg:grid-cols-12 gap-6' });

  // Left Doc Selector (4 cols)
  const leftCol = el('div', { class: 'lg:col-span-4 space-y-2' },
    el('span', { class: 'text-xs font-bold uppercase tracking-wider text-slate-500 px-1' },
      `Generated Documents (${DOCS_REGISTRY.length})`
    )
  );

  const docList = el('div', { class: 'space-y-2' });
  const docItems = For({
    each: () => DOCS_REGISTRY,
    key: (d) => d.id,
    children: (doc) => {
      const item = el('div', {
        id: `doc-tab-${doc.id}`,
        class: () => {
          const isSelected = selectedDoc.value.id === doc.id;
          return `p-4 rounded-xl border transition-all cursor-pointer ${
            isSelected
              ? 'bg-slate-900 text-white border-slate-900 shadow-md ring-1 ring-slate-900'
              : 'bg-white text-slate-800 border-slate-200 hover:border-slate-300 hover:bg-slate-50'
          }`;
        },
        onClick: () => {
          selectedDoc.value = doc;
        }
      },
        el('div', { class: 'flex items-center justify-between' },
          el('span', { class: 'font-semibold text-xs' }, doc.title),
          el('span', {
            class: () => `text-[10px] font-mono px-2 py-0.5 rounded ${
              selectedDoc.value.id === doc.id ? 'bg-slate-800 text-cyan-300' : 'bg-slate-100 text-slate-600'
            }`
          }, '.md')
        ),
        el('p', {
          class: () => `text-[11px] font-mono mt-1 ${selectedDoc.value.id === doc.id ? 'text-slate-300' : 'text-slate-500'}`
        }, doc.filename),
        el('p', {
          class: () => `text-xs mt-1.5 line-clamp-2 ${selectedDoc.value.id === doc.id ? 'text-slate-400' : 'text-slate-500'}`
        }, doc.summary)
      );
      return item;
    }
  });

  docList.appendChild(docItems);
  leftCol.appendChild(docList);
  splitGrid.appendChild(leftCol);

  // Right Markdown View (8 cols)
  const rightCol = el('div', { class: 'lg:col-span-8 bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-xs flex flex-col space-y-4' },
    el('div', { class: 'flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-slate-100' },
      el('div', null,
        el('span', { class: 'text-xs font-mono text-slate-500' }, () => selectedDoc.value.filename),
        el('h3', { class: 'text-xl font-bold text-slate-900 mt-1' }, () => selectedDoc.value.title)
      ),
      el('div', { class: 'flex items-center space-x-2' },
        el('button', {
          type: 'button',
          class: 'inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-xs font-medium text-slate-700 transition-colors cursor-pointer',
          onClick: handleCopy
        },
          () => copied.value ? icon('check', 'w-3.5 h-3.5 text-emerald-600') : icon('copy', 'w-3.5 h-3.5 text-slate-500'),
          el('span', null, () => copied.value ? 'Copied' : 'Copy MD')
        ),
        el('button', {
          type: 'button',
          class: 'inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-medium transition-colors cursor-pointer',
          onClick: handleDownload
        },
          icon('download', 'w-3.5 h-3.5'),
          el('span', null, 'Export')
        )
      )
    ),

    // Markdown rendered node
    el('div', {
      class: 'prose-container text-sm leading-relaxed overflow-y-auto max-h-[750px] pr-2'
    },
      () => renderMarkdownToAetherDOM(selectedDoc.value.content)
    )
  );

  splitGrid.appendChild(rightCol);
  root.appendChild(splitGrid);

  return root;
}
