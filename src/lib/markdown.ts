/**
 * @license Apache-2.0
 * @aether/doc - Native Aether Markdown Parser & Reactive Renderer
 *
 * Implements a 100% pure TypeScript Markdown parser & DOM generator without React or external libraries.
 * Enforces strict security policies via @aether/security (sanitizing URIs, attributes, and raw HTML).
 */

import { el, rawHtml } from '@aether/runtime';
import { sanitizeUri, escapeHtmlText } from '@aether/security';

export interface RenderMarkdownOptions {
  enableCopyCode?: boolean;
}

export function renderMarkdown(markdownText: string, options: RenderMarkdownOptions = { enableCopyCode: true }): HTMLElement {
  const container = el('div', { class: 'aether-markdown prose max-w-none text-slate-800 text-sm leading-relaxed space-y-4' });

  if (!markdownText) {
    return container;
  }

  const lines = markdownText.replace(/\r\n/g, '\n').split('\n');
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Blank line
    if (line.trim() === '') {
      i++;
      continue;
    }

    // Fenced Code Block
    if (line.trim().startsWith('```')) {
      const langMatch = line.trim().match(/^```([a-zA-Z0-9_-]*)/);
      const language = (langMatch && langMatch[1]) ? langMatch[1] : 'text';
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].trim().startsWith('```')) {
        codeLines.push(lines[i]);
        i++;
      }
      if (i < lines.length && lines[i].trim().startsWith('```')) {
        i++; // skip closing ```
      }

      const fullCode = codeLines.join('\n');
      const codeBlock = createCodeBlockElement(fullCode, language, options.enableCopyCode);
      container.appendChild(codeBlock);
      continue;
    }

    // Blockquote
    if (line.trim().startsWith('>')) {
      const quoteLines: string[] = [];
      while (i < lines.length && (lines[i].trim().startsWith('>') || (quoteLines.length > 0 && lines[i].trim() !== '' && !lines[i].trim().startsWith('#')))) {
        quoteLines.push(lines[i].replace(/^>\s?/, ''));
        i++;
      }
      const quoteEl = el('blockquote', {
        class: 'p-4 my-3 border-l-4 border-cyan-500 bg-cyan-50/50 rounded-r-xl text-slate-700 italic space-y-2'
      });
      const quoteContent = renderMarkdown(quoteLines.join('\n'), { enableCopyCode: false });
      quoteEl.appendChild(quoteContent);
      container.appendChild(quoteEl);
      continue;
    }

    // Headings
    if (/^#{1,6}\s+/.test(line)) {
      const match = line.match(/^(#{1,6})\s+(.*)$/);
      if (match) {
        const level = match[1].length;
        const rawTitle = match[2];
        const headingEl = createHeadingElement(level, rawTitle);
        container.appendChild(headingEl);
        i++;
        continue;
      }
    }

    // Horizontal Rule
    if (/^(\*{3,}|-{3,}|_{3,})$/.test(line.trim())) {
      container.appendChild(el('hr', { class: 'my-6 border-t border-slate-200' }));
      i++;
      continue;
    }

    // Markdown Table
    if (line.trim().startsWith('|') && line.trim().endsWith('|')) {
      const tableLines: string[] = [];
      while (i < lines.length && lines[i].trim().startsWith('|') && lines[i].trim().endsWith('|')) {
        tableLines.push(lines[i]);
        i++;
      }
      if (tableLines.length >= 2) {
        const tableEl = createTableElement(tableLines);
        container.appendChild(tableEl);
        continue;
      }
    }

    // Ordered List
    if (/^\s*\d+\.\s+/.test(line)) {
      const listItems: string[] = [];
      while (i < lines.length && (/^\s*\d+\.\s+/.test(lines[i]) || (listItems.length > 0 && /^\s{2,}/.test(lines[i])))) {
        listItems.push(lines[i]);
        i++;
      }
      const ol = createOrderedListElement(listItems);
      container.appendChild(ol);
      continue;
    }

    // Unordered List
    if (/^\s*[-*+]\s+/.test(line)) {
      const listItems: string[] = [];
      while (i < lines.length && (/^\s*[-*+]\s+/.test(lines[i]) || (listItems.length > 0 && /^\s{2,}/.test(lines[i])))) {
        listItems.push(lines[i]);
        i++;
      }
      const ul = createUnorderedListElement(listItems);
      container.appendChild(ul);
      continue;
    }

    // Paragraph
    const paraLines: string[] = [];
    while (
      i < lines.length &&
      lines[i].trim() !== '' &&
      !lines[i].trim().startsWith('```') &&
      !lines[i].trim().startsWith('>') &&
      !/^#{1,6}\s+/.test(lines[i]) &&
      !/^(\*{3,}|-{3,}|_{3,})$/.test(lines[i].trim()) &&
      !(lines[i].trim().startsWith('|') && lines[i].trim().endsWith('|')) &&
      !/^\s*[-*+]\s+/.test(lines[i]) &&
      !/^\s*\d+\.\s+/.test(lines[i])
    ) {
      paraLines.push(lines[i]);
      i++;
    }

    if (paraLines.length > 0) {
      const p = el('p', { class: 'text-slate-700 leading-relaxed' });
      p.innerHTML = formatInlineMarkdown(paraLines.join(' '));
      container.appendChild(p);
    }
  }

  return container;
}

function createHeadingElement(level: number, rawTitle: string): HTMLElement {
  const tag = `h${Math.min(level, 6)}` as keyof HTMLElementTagNameMap;
  const classes: Record<number, string> = {
    1: 'text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight mt-8 mb-4 pb-2 border-b border-slate-200',
    2: 'text-xl sm:text-2xl font-bold text-slate-900 tracking-tight mt-6 mb-3 pb-1 border-b border-slate-100',
    3: 'text-lg sm:text-xl font-semibold text-slate-900 mt-5 mb-2',
    4: 'text-base sm:text-lg font-semibold text-slate-800 mt-4 mb-2',
    5: 'text-sm sm:text-base font-medium text-slate-800 mt-3 mb-1',
    6: 'text-xs sm:text-sm font-medium uppercase text-slate-500 mt-3 mb-1 tracking-wider'
  };

  const cleanId = rawTitle
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');

  const heading = el(tag, {
    id: cleanId,
    class: classes[level] || classes[3]
  });

  heading.innerHTML = formatInlineMarkdown(rawTitle);
  return heading;
}

function createCodeBlockElement(code: string, language: string, enableCopy = true): HTMLElement {
  const wrapper = el('div', {
    class: 'my-4 rounded-xl border border-slate-800 bg-slate-950 overflow-hidden shadow-md text-xs font-mono'
  });

  const header = el('div', {
    class: 'flex items-center justify-between px-4 py-2 bg-slate-900/90 border-b border-slate-800 text-slate-400 select-none'
  });

  const langLabel = el('span', { class: 'text-cyan-400 font-semibold tracking-wider text-[11px]' }, language.toUpperCase());
  header.appendChild(langLabel);

  if (enableCopy) {
    const copyBtn = el('button', {
      type: 'button',
      class: 'inline-flex items-center space-x-1.5 px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition text-[10px]',
      onClick: () => {
        if (typeof navigator !== 'undefined' && navigator.clipboard) {
          navigator.clipboard.writeText(code);
          copyBtn.textContent = 'Copied!';
          setTimeout(() => {
            copyBtn.textContent = 'Copy';
          }, 2000);
        }
      }
    }, 'Copy');
    header.appendChild(copyBtn);
  }

  wrapper.appendChild(header);

  const pre = el('pre', {
    class: 'p-4 overflow-x-auto text-slate-100 leading-relaxed font-mono text-[12px]'
  });
  const codeEl = el('code', { class: `language-${language}` });
  codeEl.textContent = code;
  pre.appendChild(codeEl);
  wrapper.appendChild(pre);

  return wrapper;
}

function createTableElement(tableLines: string[]): HTMLElement {
  const wrapper = el('div', { class: 'my-4 overflow-x-auto rounded-xl border border-slate-200 shadow-xs' });
  const table = el('table', { class: 'min-w-full divide-y divide-slate-200 text-xs sm:text-sm text-left' });

  // Parse header
  const headerCells = parseTableRow(tableLines[0]);
  const thead = el('thead', { class: 'bg-slate-50 text-slate-700 font-bold uppercase text-[11px] tracking-wider' });
  const trHead = el('tr', null);
  for (const cell of headerCells) {
    const th = el('th', { class: 'px-4 py-3' });
    th.innerHTML = formatInlineMarkdown(cell);
    trHead.appendChild(th);
  }
  thead.appendChild(trHead);
  table.appendChild(thead);

  // Parse body
  const tbody = el('tbody', { class: 'divide-y divide-slate-100 bg-white' });
  const startIndex = tableLines[1] && tableLines[1].includes('-') ? 2 : 1;

  for (let idx = startIndex; idx < tableLines.length; idx++) {
    const rowCells = parseTableRow(tableLines[idx]);
    const tr = el('tr', { class: 'hover:bg-slate-50/80 transition' });
    for (let c = 0; c < headerCells.length; c++) {
      const cellText = rowCells[c] || '';
      const td = el('td', { class: 'px-4 py-2.5 text-slate-700 align-top' });
      td.innerHTML = formatInlineMarkdown(cellText);
      tr.appendChild(td);
    }
    tbody.appendChild(tr);
  }

  table.appendChild(tbody);
  wrapper.appendChild(table);
  return wrapper;
}

function parseTableRow(line: string): string[] {
  const trimmed = line.trim();
  const inner = trimmed.startsWith('|') ? trimmed.slice(1, trimmed.endsWith('|') ? -1 : undefined) : trimmed;
  return inner.split('|').map((s) => s.trim());
}

function createUnorderedListElement(items: string[]): HTMLElement {
  const ul = el('ul', { class: 'my-3 space-y-1.5 list-disc list-inside text-slate-700 pl-2' });
  for (const raw of items) {
    const textContent = raw.replace(/^\s*[-*+]\s+/, '');
    const li = el('li', { class: 'leading-relaxed' });
    li.innerHTML = formatInlineMarkdown(textContent);
    ul.appendChild(li);
  }
  return ul;
}

function createOrderedListElement(items: string[]): HTMLElement {
  const ol = el('ol', { class: 'my-3 space-y-1.5 list-decimal list-inside text-slate-700 pl-2' });
  for (const raw of items) {
    const textContent = raw.replace(/^\s*\d+\.\s+/, '');
    const li = el('li', { class: 'leading-relaxed' });
    li.innerHTML = formatInlineMarkdown(textContent);
    ol.appendChild(li);
  }
  return ol;
}

export function formatInlineMarkdown(text: string): string {
  if (!text) return '';

  let escaped = escapeHtmlText(text);

  // Inline Code: `code`
  escaped = escaped.replace(/`([^`]+)`/g, '<code class="px-1.5 py-0.5 rounded bg-slate-100 text-cyan-700 font-mono text-[12px] border border-slate-200">$1</code>');

  // Bold: **text** or __text__
  escaped = escaped.replace(/\*\*([^*]+)\*\*/g, '<strong class="font-bold text-slate-900">$1</strong>');
  escaped = escaped.replace(/__([^_]+)__/g, '<strong class="font-bold text-slate-900">$1</strong>');

  // Italic: *text* or _text_
  escaped = escaped.replace(/\*([^*]+)\*/g, '<em class="italic">$1</em>');
  escaped = escaped.replace(/_([^_]+)_/g, '<em class="italic">$1</em>');

  // Strikethrough: ~~text~~
  escaped = escaped.replace(/~~([^~]+)~~/g, '<del class="line-through text-slate-400">$1</del>');

  // Images: ![alt](url)
  escaped = escaped.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, (_, alt, url) => {
    const safeUrl = sanitizeUri(url);
    return `<img src="${safeUrl}" alt="${alt}" class="rounded-lg shadow-sm max-w-full my-2" loading="lazy" />`;
  });

  // Links: [text](url)
  escaped = escaped.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_, label, url) => {
    const safeUrl = sanitizeUri(url);
    const isExternal = safeUrl.startsWith('http');
    const target = isExternal ? ' target="_blank" rel="noopener noreferrer"' : '';
    return `<a href="${safeUrl}"${target} class="font-medium text-cyan-600 hover:text-cyan-800 hover:underline transition">${label}</a>`;
  });

  return escaped;
}

export { renderMarkdown as renderMarkdownToAetherDOM };
