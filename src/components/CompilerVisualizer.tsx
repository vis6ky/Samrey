import React, { useState } from 'react';
import { ArrowRight, CheckCircle, ShieldCheck, Code, Eye, RefreshCw, Terminal } from 'lucide-react';

interface Preset {
  id: string;
  name: string;
  description: string;
  tsxCode: string;
  airTree: object;
  securityClassifications: { expression: string; context: string; rule: string; passed: boolean }[];
  compiledJs: string;
  reactComparisonJs: string;
}

const PRESETS: Preset[] = [
  {
    id: 'counter',
    name: 'Counter & Dynamic Text Binding',
    description: 'Demonstrates single component execution, static HTML template extraction, and fine-grained text hole patching.',
    tsxCode: `import { signal, computed } from '@aether/reactivity';

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
    compiledJs: `import { template as _tmpl, bindText as _bindText, on as _on } from '@aether/runtime';
import { signal, computed } from '@aether/reactivity';

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
    compiledJs: `import { template as _tmpl, bindText as _bindText, bindAttr as _bindAttr } from '@aether/runtime';
import { sanitizeUri as _sanitizeUri } from '@aether/security';

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

export const CompilerVisualizer: React.FC = () => {
  const [activePreset, setActivePreset] = useState<Preset>(PRESETS[0]);
  const [activeTab, setActiveTab] = useState<'air' | 'compiled' | 'security' | 'comparison'>('compiled');

  return (
    <div className="space-y-6">
      {/* Header & Pipeline Concept */}
      <div className="bg-slate-900 text-white rounded-2xl p-6 border border-slate-800 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-slate-800 text-cyan-300 text-xs font-mono mb-2">
              <Code className="w-3.5 h-3.5" />
              <span>Aether Intermediate Representation (AIR) Engine</span>
            </div>
            <h2 className="text-2xl font-bold tracking-tight">
              Compiler Pipeline & Codegen Simulator
            </h2>
            <p className="text-slate-400 text-sm mt-1 max-w-3xl">
              Inspect how standard TypeScript TSX components are parsed into AIR, statically hoisted into native browser &lt;template&gt; fragments, context-sanitized, and emitted as direct DOM mutations.
            </p>
          </div>
        </div>

        {/* Visual Pipeline Steps */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 mt-6 pt-6 border-t border-slate-800 text-xs font-mono">
          <div className="p-3 rounded-xl bg-slate-800/80 border border-slate-700">
            <span className="text-cyan-400 font-bold">1. Lexer & Parser</span>
            <p className="text-slate-400 text-[11px] mt-1">SWC/OXC AST Parser extracts JSX markup</p>
          </div>
          <div className="p-3 rounded-xl bg-slate-800/80 border border-slate-700">
            <span className="text-emerald-400 font-bold">2. Security Classifier</span>
            <p className="text-slate-400 text-[11px] mt-1">Tags HTML, Attr, URI, CSS contexts</p>
          </div>
          <div className="p-3 rounded-xl bg-slate-800/80 border border-slate-700">
            <span className="text-purple-400 font-bold">3. AIR Generation</span>
            <p className="text-slate-400 text-[11px] mt-1">Extracts static vs dynamic slot paths</p>
          </div>
          <div className="p-3 rounded-xl bg-slate-800/80 border border-slate-700">
            <span className="text-amber-400 font-bold">4. Static Hoisting</span>
            <p className="text-slate-400 text-[11px] mt-1">Pre-parses &lt;template&gt; in module scope</p>
          </div>
          <div className="p-3 rounded-xl bg-slate-800/80 border border-slate-700">
            <span className="text-sky-400 font-bold">5. Direct DOM Codegen</span>
            <p className="text-slate-400 text-[11px] mt-1">Emits cloneNode(true) & signal binders</p>
          </div>
        </div>
      </div>

      {/* Preset Selector */}
      <div className="flex flex-wrap gap-2 items-center">
        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider mr-2">Sample Presets:</span>
        {PRESETS.map((preset) => (
          <button
            key={preset.id}
            id={`preset-btn-${preset.id}`}
            onClick={() => setActivePreset(preset)}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
              activePreset.id === preset.id
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            {preset.name}
          </button>
        ))}
      </div>

      {/* Compiler Playground Split View */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Source TSX */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex flex-col">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center space-x-2">
              <span className="w-2.5 h-2.5 rounded-full bg-cyan-500"></span>
              <span className="font-mono text-xs font-bold text-slate-800">Source Component (TSX)</span>
            </div>
            <span className="text-[11px] font-mono text-slate-500">Single Execution Component</span>
          </div>

          <p className="text-xs text-slate-500 mt-2 mb-3">{activePreset.description}</p>

          <div className="bg-slate-950 text-slate-200 p-4 rounded-xl font-mono text-xs overflow-x-auto flex-1 leading-relaxed">
            <pre>{activePreset.tsxCode}</pre>
          </div>
        </div>

        {/* Right: Compiled Outputs & Diagnostics */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex flex-col">
          {/* Sub-tabs */}
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex space-x-1">
              <button
                onClick={() => setActiveTab('compiled')}
                className={`px-3 py-1 rounded-lg text-xs font-medium font-mono ${
                  activeTab === 'compiled'
                    ? 'bg-slate-900 text-white'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                Generated JS
              </button>
              <button
                onClick={() => setActiveTab('air')}
                className={`px-3 py-1 rounded-lg text-xs font-medium font-mono ${
                  activeTab === 'air'
                    ? 'bg-slate-900 text-white'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                AIR JSON Tree
              </button>
              <button
                onClick={() => setActiveTab('security')}
                className={`px-3 py-1 rounded-lg text-xs font-medium font-mono ${
                  activeTab === 'security'
                    ? 'bg-slate-900 text-white'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                Security Audit
              </button>
              <button
                onClick={() => setActiveTab('comparison')}
                className={`px-3 py-1 rounded-lg text-xs font-medium font-mono ${
                  activeTab === 'comparison'
                    ? 'bg-slate-900 text-white'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                vs React VDOM
              </button>
            </div>
          </div>

          <div className="mt-4 flex-1">
            {activeTab === 'compiled' && (
              <div className="space-y-2">
                <div className="flex items-center space-x-2 text-xs font-mono text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-200">
                  <CheckCircle className="w-3.5 h-3.5" />
                  <span>Zero VDOM Diffing · Module-Hoisted &lt;template&gt; · Surgical Pointers</span>
                </div>
                <div className="bg-slate-950 text-emerald-400 p-4 rounded-xl font-mono text-xs overflow-x-auto max-h-[420px] leading-relaxed">
                  <pre>{activePreset.compiledJs}</pre>
                </div>
              </div>
            )}

            {activeTab === 'air' && (
              <div className="space-y-2">
                <div className="flex items-center space-x-2 text-xs font-mono text-purple-600 bg-purple-50 px-3 py-1.5 rounded-lg border border-purple-200">
                  <Code className="w-3.5 h-3.5" />
                  <span>Structured Intermediate Representation Schema</span>
                </div>
                <div className="bg-slate-950 text-purple-300 p-4 rounded-xl font-mono text-xs overflow-x-auto max-h-[420px] leading-relaxed">
                  <pre>{JSON.stringify(activePreset.airTree, null, 2)}</pre>
                </div>
              </div>
            )}

            {activeTab === 'security' && (
              <div className="space-y-3">
                <div className="flex items-center space-x-2 text-xs font-mono text-cyan-700 bg-cyan-50 px-3 py-1.5 rounded-lg border border-cyan-200">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>AOT Context-Aware Sanitizer Classification</span>
                </div>

                <div className="space-y-2">
                  {activePreset.securityClassifications.map((sec, idx) => (
                    <div key={idx} className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-xs font-bold text-slate-800">{sec.expression}</span>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-semibold">
                          {sec.context}
                        </span>
                      </div>
                      <p className="text-xs text-slate-600">{sec.rule}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'comparison' && (
              <div className="space-y-2">
                <div className="flex items-center space-x-2 text-xs font-mono text-sky-700 bg-sky-50 px-3 py-1.5 rounded-lg border border-sky-200">
                  <Terminal className="w-3.5 h-3.5" />
                  <span>React Fiber Transpilation Comparison</span>
                </div>
                <div className="bg-slate-950 text-sky-300 p-4 rounded-xl font-mono text-xs overflow-x-auto max-h-[420px] leading-relaxed">
                  <pre>{activePreset.reactComparisonJs}</pre>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
