/**
 * @license Apache-2.0
 * @samrey/doc - Native Samrey Compiler & IR Pipeline Visualizer
 */

import { el, Show, For } from '@samrey/runtime';
import { signal } from '@samrey/reactivity';
import { icon } from '../lib/icons.js';

export interface Preset {
  id: string;
  name: string;
  description: string;
  tsxCode: string;
  airTree: object;
  securityClassifications: { expression: string; context: string; rule: string; passed: boolean }[];
  compiledJs: string;
  reactComparisonJs: string;
}

export const PRESETS: Preset[] = [
  {
    id: 'counter',
    name: 'Counter & Dynamic Text Binding',
    description: 'Demonstrates single component execution, static HTML template extraction, and fine-grained text hole patching.',
    tsxCode: `import { signal, computed } from '@samrey/reactivity';

export function Counter(props: { initial?: number }) {
  const count = signal(props.initial ?? 0);
  const double = computed(() => count.value * 2);

  return (
    <div class="counter-box" id="widget-1">
      <h3 class="title">Counter: {count.value}</h3>
      <p class="subtitle">Double: {double.value}</p>
      <button type="button" onClick={() => count.value++}>
        Increment
      </button>
    </div>
  );
}`,
    airTree: {
      kind: 'AIRComponent',
      name: 'Counter',
      template: '<div class="counter-box" id="widget-1"><h3 class="title">Counter: <!></h3><p class="subtitle">Double: <!></p><button type="button">Increment</button></div>',
      slots: [
        { type: 'text', path: [0, 0], expression: 'count.value', context: 'textContent' },
        { type: 'text', path: [1, 0], expression: 'double.value', context: 'textContent' },
        { type: 'event', path: [2], event: 'click', handler: '() => count.value++' }
      ]
    },
    securityClassifications: [
      { expression: 'count.value', context: 'HTML TextNode', rule: 'Compiled to node.textContent = val (No innerHTML)', passed: true },
      { expression: 'double.value', context: 'HTML TextNode', rule: 'Compiled to node.textContent = val', passed: true },
      { expression: '() => count.value++', context: 'EventListener', rule: 'Delegated root listener event subscription', passed: true }
    ],
    compiledJs: `import { template as _tmpl, bindText as _bindText, on as _on } from '@samrey/runtime';
import { signal, computed } from '@samrey/reactivity';

// 1. Static HTML Hoisted once at module load
const _tmpl$1 = _tmpl(\`<div class="counter-box" id="widget-1"><h3 class="title">Counter: </h3><p class="subtitle">Double: </p><button type="button">Increment</button></div>\`);

// 2. Component executes ONCE
export function Counter(props) {
  const count = signal(props.initial ?? 0);
  const double = computed(() => count.value * 2);

  const _el = _tmpl$1(); // cloneNode(true)
  const _h3 = _el.firstChild;
  const _p = _h3.nextSibling;
  const _btn = _p.nextSibling;

  // 3. Direct fine-grained reactive subscriptions
  _bindText(_h3, () => count.value);
  _bindText(_p, () => double.value);
  _on(_btn, 'click', () => count.value++);

  return _el; // Real DOM Node
}`,
    reactComparisonJs: `// React 19 Equivalent (Re-executes function on every click)
export function Counter(props) {
  const [count, setCount] = useState(props.initial ?? 0);
  const double = useMemo(() => count * 2, [count]);

  // Re-allocates virtual element objects on every render
  return _jsx("div", {
    className: "counter-box",
    id: "widget-1",
    children: [
      _jsxs("h3", { className: "title", children: ["Counter: ", count] }),
      _jsxs("p", { className: "subtitle", children: ["Double: ", double] }),
      _jsx("button", { type: "button", onClick: () => setCount(c => c + 1), children: "Increment" })
    ]
  });
}`
  },
  {
    id: 'security-uri',
    name: 'Secure Link & Attribute Sanitization',
    description: 'Demonstrates compile-time context detection of URI schemes, blocking javascript: attacks automatically.',
    tsxCode: `export function UserProfileCard(props: { username: string; userWebsite: string }) {
  return (
    <div class="profile-card">
      <h4>User: {props.username}</h4>
      <a href={props.userWebsite} target="_blank" rel="noopener noreferrer">
        Visit Website
      </a>
    </div>
  );
}`,
    airTree: {
      kind: 'AIRComponent',
      name: 'UserProfileCard',
      template: '<div class="profile-card"><h4>User: <!></h4><a target="_blank" rel="noopener noreferrer">Visit Website</a></div>',
      slots: [
        { type: 'text', path: [0, 0], expression: 'props.username', context: 'textContent' },
        { type: 'attribute', path: [1], name: 'href', expression: 'props.userWebsite', context: 'uri-attr', sanitizer: 'sanitizeUri' }
      ]
    },
    securityClassifications: [
      { expression: 'props.username', context: 'HTML TextNode', rule: 'Direct textContent escaping', passed: true },
      { expression: 'props.userWebsite', context: 'URI Attribute (href)', rule: 'Blocked javascript:/data: schemes via sanitizeUri()', passed: true }
    ],
    compiledJs: `import { template as _tmpl, bindText as _bindText, bindAttr as _bindAttr } from '@samrey/runtime';
import { sanitizeUri as _sanitizeUri } from '@samrey/security';

const _tmpl$2 = _tmpl(\`<div class="profile-card"><h4>User: </h4><a target="_blank" rel="noopener noreferrer">Visit Website</a></div>\`);

export function UserProfileCard(props) {
  const _el = _tmpl$2();
  const _h4 = _el.firstChild;
  const _a = _h4.nextSibling;

  _bindText(_h4, () => props.username);
  _bindAttr(_a, 'href', () => _sanitizeUri(props.userWebsite));

  return _el;
}`,
    reactComparisonJs: `// React Equivalent (Requires developer to manually sanitize userWebsite)
export function UserProfileCard(props) {
  return _jsx("div", {
    className: "profile-card",
    children: [
      _jsxs("h4", { children: ["User: ", props.username] }),
      // Vulnerable if userWebsite = "javascript:alert(1)"
      _jsx("a", { href: props.userWebsite, target: "_blank", rel: "noopener noreferrer", children: "Visit Website" })
    ]
  });
}`
  }
];

export function CompilerVisualizer(): HTMLElement {
  const activePreset = signal<Preset>(PRESETS[0]);
  const activeTab = signal<'compiled' | 'air' | 'security' | 'comparison'>('compiled');

  const root = el('div', { class: 'space-y-6' });

  // Banner
  const banner = el('div', { class: 'bg-slate-900 text-white rounded-2xl p-6 border border-slate-800 shadow-sm' },
    el('div', { class: 'flex flex-col lg:flex-row lg:items-center justify-between gap-4' },
      el('div', null,
        el('div', { class: 'inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-slate-800 text-cyan-300 text-xs font-mono mb-2' },
          icon('code', 'w-3.5 h-3.5'),
          el('span', null, 'Samrey Intermediate Representation (AIR) Engine')
        ),
        el('h2', { class: 'text-2xl font-bold tracking-tight' }, 'Compiler Pipeline & Codegen Simulator'),
        el('p', { class: 'text-slate-400 text-sm mt-1 max-w-3xl' },
          'Inspect how standard TypeScript TSX components are parsed into AIR, statically hoisted into native browser <template> fragments, context-sanitized, and emitted as direct DOM mutations.'
        )
      )
    ),
    el('div', { class: 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 mt-6 pt-6 border-t border-slate-800 text-xs font-mono' },
      el('div', { class: 'p-3 rounded-xl bg-slate-800/80 border border-slate-700' },
        el('span', { class: 'text-cyan-400 font-bold' }, '1. Lexer & Parser'),
        el('p', { class: 'text-slate-400 text-[11px] mt-1' }, 'SWC/OXC AST Parser extracts JSX markup')
      ),
      el('div', { class: 'p-3 rounded-xl bg-slate-800/80 border border-slate-700' },
        el('span', { class: 'text-emerald-400 font-bold' }, '2. Security Classifier'),
        el('p', { class: 'text-slate-400 text-[11px] mt-1' }, 'Tags HTML, Attr, URI, CSS contexts')
      ),
      el('div', { class: 'p-3 rounded-xl bg-slate-800/80 border border-slate-700' },
        el('span', { class: 'text-purple-400 font-bold' }, '3. AIR Generation'),
        el('p', { class: 'text-slate-400 text-[11px] mt-1' }, 'Extracts static vs dynamic slot paths')
      ),
      el('div', { class: 'p-3 rounded-xl bg-slate-800/80 border border-slate-700' },
        el('span', { class: 'text-amber-400 font-bold' }, '4. Static Hoisting'),
        el('p', { class: 'text-slate-400 text-[11px] mt-1' }, 'Pre-parses <template> in module scope')
      ),
      el('div', { class: 'p-3 rounded-xl bg-slate-800/80 border border-slate-700' },
        el('span', { class: 'text-sky-400 font-bold' }, '5. Direct DOM Codegen'),
        el('p', { class: 'text-slate-400 text-[11px] mt-1' }, 'Emits cloneNode(true) & signal binders')
      )
    )
  );
  root.appendChild(banner);

  // Preset Selector
  const presetRow = el('div', { class: 'flex flex-wrap gap-2 items-center' },
    el('span', { class: 'text-xs font-bold text-slate-500 uppercase tracking-wider mr-2' }, 'Sample Presets:')
  );

  for (const preset of PRESETS) {
    const btn = el('button', {
      id: `preset-btn-${preset.id}`,
      type: 'button',
      class: () => `px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
        activePreset.value.id === preset.id
          ? 'bg-slate-900 text-white shadow-xs'
          : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
      }`,
      onClick: () => {
        activePreset.value = preset;
      }
    }, preset.name);
    presetRow.appendChild(btn);
  }
  root.appendChild(presetRow);

  // Split View: Left Source, Right Outputs
  const splitGrid = el('div', { class: 'grid grid-cols-1 lg:grid-cols-2 gap-6' });

  // Left: Source TSX
  const leftCol = el('div', { class: 'bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex flex-col' },
    el('div', { class: 'flex items-center justify-between pb-3 border-b border-slate-100' },
      el('div', { class: 'flex items-center space-x-2' },
        el('span', { class: 'w-2.5 h-2.5 rounded-full bg-cyan-500' }),
        el('span', { class: 'font-mono text-xs font-bold text-slate-800' }, 'Source Component (TSX)')
      ),
      el('span', { class: 'text-[11px] font-mono text-slate-500' }, 'Single Execution Component')
    ),
    el('p', { class: 'text-xs text-slate-500 mt-2 mb-3' },
      () => activePreset.value.description
    ),
    el('div', { class: 'bg-slate-950 text-slate-200 p-4 rounded-xl font-mono text-xs overflow-x-auto flex-1 leading-relaxed' },
      el('pre', null, () => activePreset.value.tsxCode)
    )
  );
  splitGrid.appendChild(leftCol);

  // Right: Compiled Outputs & Tabs
  const rightCol = el('div', { class: 'bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex flex-col' });

  const tabsHeader = el('div', { class: 'flex items-center justify-between pb-3 border-b border-slate-100' });
  const tabsList = el('div', { class: 'flex space-x-1' });

  const tabDefs: { id: 'compiled' | 'air' | 'security' | 'comparison'; label: string }[] = [
    { id: 'compiled', label: 'Generated JS' },
    { id: 'air', label: 'AIR JSON Tree' },
    { id: 'security', label: 'Security Audit' },
    { id: 'comparison', label: 'vs React VDOM' }
  ];

  for (const t of tabDefs) {
    const tabBtn = el('button', {
      type: 'button',
      class: () => `px-3 py-1 rounded-lg text-xs font-medium font-mono cursor-pointer transition ${
        activeTab.value === t.id ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'
      }`,
      onClick: () => {
        activeTab.value = t.id;
      }
    }, t.label);
    tabsList.appendChild(tabBtn);
  }
  tabsHeader.appendChild(tabsList);
  rightCol.appendChild(tabsHeader);

  const tabContent = el('div', { class: 'mt-4 flex-1' });

  // Tab 1: Compiled JS
  const compiledView = Show({
    when: () => activeTab.value === 'compiled',
    children: () => el('div', { class: 'space-y-2' },
      el('div', { class: 'flex items-center space-x-2 text-xs font-mono text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-200' },
        icon('check-circle', 'w-3.5 h-3.5'),
        el('span', null, 'Zero VDOM Diffing · Module-Hoisted <template> · Surgical Pointers')
      ),
      el('div', { class: 'bg-slate-950 text-emerald-400 p-4 rounded-xl font-mono text-xs overflow-x-auto max-h-[420px] leading-relaxed' },
        el('pre', null, () => activePreset.value.compiledJs)
      )
    )
  });

  // Tab 2: AIR JSON
  const airView = Show({
    when: () => activeTab.value === 'air',
    children: () => el('div', { class: 'space-y-2' },
      el('div', { class: 'flex items-center space-x-2 text-xs font-mono text-purple-600 bg-purple-50 px-3 py-1.5 rounded-lg border border-purple-200' },
        icon('code', 'w-3.5 h-3.5'),
        el('span', null, 'Structured Intermediate Representation Schema')
      ),
      el('div', { class: 'bg-slate-950 text-purple-300 p-4 rounded-xl font-mono text-xs overflow-x-auto max-h-[420px] leading-relaxed' },
        el('pre', null, () => JSON.stringify(activePreset.value.airTree, null, 2))
      )
    )
  });

  // Tab 3: Security Audit
  const secView = Show({
    when: () => activeTab.value === 'security',
    children: () => {
      const secContainer = el('div', { class: 'space-y-3' },
        el('div', { class: 'flex items-center space-x-2 text-xs font-mono text-cyan-700 bg-cyan-50 px-3 py-1.5 rounded-lg border border-cyan-200' },
          icon('shield-check', 'w-3.5 h-3.5'),
          el('span', null, 'AOT Context-Aware Sanitizer Classification')
        )
      );

      const list = For({
        each: () => activePreset.value.securityClassifications,
        key: (sec) => sec.expression + sec.context,
        children: (sec) => el('div', { class: 'p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1' },
          el('div', { class: 'flex items-center justify-between' },
            el('span', { class: 'font-mono text-xs font-bold text-slate-800' }, sec.expression),
            el('span', { class: 'text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-semibold' },
              sec.context
            )
          ),
          el('p', { class: 'text-xs text-slate-600' }, sec.rule)
        )
      });

      secContainer.appendChild(list);
      return secContainer;
    }
  });

  // Tab 4: Comparison
  const compView = Show({
    when: () => activeTab.value === 'comparison',
    children: () => el('div', { class: 'space-y-2' },
      el('div', { class: 'flex items-center space-x-2 text-xs font-mono text-sky-700 bg-sky-50 px-3 py-1.5 rounded-lg border border-sky-200' },
        icon('terminal', 'w-3.5 h-3.5'),
        el('span', null, 'React Fiber Transpilation Comparison')
      ),
      el('div', { class: 'bg-slate-950 text-sky-300 p-4 rounded-xl font-mono text-xs overflow-x-auto max-h-[420px] leading-relaxed' },
        el('pre', null, () => activePreset.value.reactComparisonJs)
      )
    )
  });

  tabContent.appendChild(compiledView);
  tabContent.appendChild(airView);
  tabContent.appendChild(secView);
  tabContent.appendChild(compView);
  rightCol.appendChild(tabContent);

  splitGrid.appendChild(rightCol);
  root.appendChild(splitGrid);

  return root;
}
