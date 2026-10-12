/**
 * @license Apache-2.0
 * Generates publication-ready SVGs and Mermaid Markdown descriptions for Figures 1 to 10
 */

import fs from 'node:fs';
import path from 'node:path';

const outDir = path.resolve('docs/research/FIGURES');
fs.mkdirSync(outDir, { recursive: true });

function createSvgWrapper(width: number, height: number, title: string, content: string): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">
  <defs>
    <style>
      .bg { fill: #f8fafc; }
      .title { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; font-size: 18px; font-weight: 700; fill: #0f172a; }
      .subtitle { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; font-size: 12px; fill: #64748b; }
      .box { rx: 12px; stroke-width: 1.5px; }
      .box-blue { fill: #eff6ff; stroke: #3b82f6; }
      .box-indigo { fill: #eef2ff; stroke: #6366f1; }
      .box-emerald { fill: #ecfdf5; stroke: #10b981; }
      .box-amber { fill: #fffbeb; stroke: #f59e0b; }
      .box-rose { fill: #fff1f2; stroke: #f43f5e; }
      .box-slate { fill: #f1f5f9; stroke: #94a3b8; }
      .box-purple { fill: #faf5ff; stroke: #a855f7; }
      .box-title { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; font-size: 13px; font-weight: 700; fill: #1e293b; }
      .box-text { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; font-size: 11px; fill: #475569; }
      .arrow { stroke: #64748b; stroke-width: 2px; fill: none; marker-end: url(#arrowhead); }
      .arrow-blue { stroke: #3b82f6; stroke-width: 2px; fill: none; marker-end: url(#arrowhead-blue); }
      .arrow-emerald { stroke: #10b981; stroke-width: 2px; fill: none; marker-end: url(#arrowhead-emerald); }
    </style>
    <marker id="arrowhead" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto">
      <polygon points="0 0, 8 3, 0 6" fill="#64748b" />
    </marker>
    <marker id="arrowhead-blue" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto">
      <polygon points="0 0, 8 3, 0 6" fill="#3b82f6" />
    </marker>
    <marker id="arrowhead-emerald" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto">
      <polygon points="0 0, 8 3, 0 6" fill="#10b981" />
    </marker>
  </defs>
  <rect width="100%" height="100%" class="bg" rx="16" />
  <text x="24" y="36" class="title">${title}</text>
  <text x="24" y="56" class="subtitle">Samrey Framework v1.0.0 Architectural Specification</text>
  ${content}
</svg>`;
}

// ---------------------------------------------------------------------------
// Figure 1: Overall Architecture
// ---------------------------------------------------------------------------
const fig1Svg = createSvgWrapper(900, 520, 'Figure 1: Overall Samrey Architecture', `
  <!-- Tier 3: Developer Ecosystem -->
  <rect x="30" y="80" width="840" height="90" class="box box-indigo" />
  <text x="50" y="105" class="box-title">Developer &amp; Tooling Tier</text>
  <rect x="50" y="115" width="240" height="42" class="box box-slate" />
  <text x="65" y="140" class="box-title">@samrey/cli (Vite, Scaffolder, Audit)</text>
  <rect x="310" y="115" width="260" height="42" class="box box-slate" />
  <text x="325" y="140" class="box-title">@samrey/devtools (Graph Visualizer)</text>
  <rect x="590" y="115" width="260" height="42" class="box box-purple" />
  <text x="605" y="140" class="box-title">Developer Assistant (AI + Sandbox)</text>

  <!-- Tier 2: Application Infrastructure -->
  <rect x="30" y="190" width="840" height="100" class="box box-blue" />
  <text x="50" y="215" class="box-title">Application Infrastructure Tier</text>
  <rect x="50" y="225" width="180" height="50" class="box box-slate" />
  <text x="65" y="248" class="box-title">@samrey/router</text>
  <text x="65" y="263" class="box-text">Type-Safe Routing</text>
  <rect x="250" y="225" width="180" height="50" class="box box-slate" />
  <text x="265" y="248" class="box-title">@samrey/forms</text>
  <text x="265" y="263" class="box-text">Standard Schema</text>
  <rect x="450" y="225" width="180" height="50" class="box box-slate" />
  <text x="465" y="248" class="box-title">@samrey/http</text>
  <text x="465" y="263" class="box-text">Resource Fetching</text>
  <rect x="650" y="225" width="200" height="50" class="box box-slate" />
  <text x="665" y="248" class="box-title">@samrey/ssr</text>
  <text x="665" y="263" class="box-text">Streaming &amp; Resumable</text>

  <!-- Tier 1: Core Compilation & Runtime -->
  <rect x="30" y="310" width="840" height="95" class="box box-emerald" />
  <text x="50" y="335" class="box-title">Core Runtime &amp; Compiler Tier</text>
  <rect x="50" y="345" width="370" height="48" class="box box-slate" />
  <text x="65" y="368" class="box-title">@samrey/compiler (AOT Parser, AIR, Optimizer)</text>
  <rect x="440" y="345" width="410" height="48" class="box box-slate" />
  <text x="455" y="368" class="box-title">@samrey/runtime (Direct DOM, Template Cloning, Lifecycle)</text>

  <!-- Tier 0: Foundational Layer -->
  <rect x="30" y="425" width="840" height="75" class="box box-amber" />
  <text x="50" y="450" class="box-title">Foundational Tier (Zero External Dependencies)</text>
  <rect x="50" y="455" width="370" height="35" class="box box-slate" />
  <text x="65" y="478" class="box-title">@samrey/reactivity (Topological Push-Pull Graph)</text>
  <rect x="440" y="455" width="410" height="35" class="box box-slate" />
  <text x="455" y="478" class="box-title">@samrey/security (Contextual Sanitizers &amp; Trusted Types)</text>
`);

fs.writeFileSync(path.join(outDir, 'Figure1_OverallArchitecture.svg'), fig1Svg);
fs.writeFileSync(path.join(outDir, 'Figure1_OverallArchitecture.md'), `### Figure 1: Overall Samrey Architecture

\`\`\`mermaid
flowchart TD
  subgraph T3["Developer & Tooling Tier"]
    CLI["@samrey/cli\\n(Vite Plugin, Scaffolder, Audit)"]
    DEVTOOLS["@samrey/devtools\\n(State Inspector, Graph Visualizer)"]
    TESTING["@samrey/testing\\n(Headless Test Harness)"]
    ASSISTANT["Developer Assistant\\n(AI Synthesis, Sandbox Playground)"]
  end

  subgraph T2["Application Infrastructure Tier"]
    ROUTER["@samrey/router\\n(Type-Safe Routes, Loaders)"]
    FORMS["@samrey/forms\\n(Standard Schema, Auto-ARIA)"]
    HTTP["@samrey/http\\n(Reactive Resource Cache)"]
    SSR["@samrey/ssr\\n(Streaming HTML, State Serializer)"]
  end

  subgraph T1["Core Compilation & Runtime Tier"]
    COMPILER["@samrey/compiler\\n(AST Parser, AIR, Surgical Codegen)"]
    RUNTIME["@samrey/runtime\\n(Direct DOM, Template Cloning)"]
  end

  subgraph T0["Foundational Zero-Dependency Tier"]
    REACTIVITY["@samrey/reactivity\\n(Topological Push-Pull Signal Graph)"]
    SECURITY["@samrey/security\\n(Trusted Types, Context Sanitizers, CSRF)"]
  end

  T3 --> T2
  T2 --> T1
  T1 --> T0
\`\`\`
`);

// ---------------------------------------------------------------------------
// Figure 2: Reactive Dependency and Update Flow
// ---------------------------------------------------------------------------
const fig2Svg = createSvgWrapper(900, 400, 'Figure 2: Reactive Dependency and Update Flow', `
  <rect x="50" y="100" width="220" height="90" class="box box-blue" />
  <text x="70" y="130" class="box-title">1. Signal (State Producer)</text>
  <text x="70" y="150" class="box-text">Holds raw value + subscriber set</text>
  <text x="70" y="168" class="box-text">Increments global clock on write</text>

  <rect x="340" y="100" width="240" height="90" class="box box-purple" />
  <text x="360" y="130" class="box-title">2. Computed (Derived Node)</text>
  <text x="360" y="150" class="box-text">Topological depth ordering</text>
  <text x="360" y="168" class="box-text">Lazy evaluation via clock versioning</text>

  <rect x="650" y="100" width="200" height="90" class="box box-emerald" />
  <text x="670" y="130" class="box-title">3. Effect (Side Effect)</text>
  <text x="670" y="150" class="box-text">Queued in microtask batch</text>
  <text x="670" y="168" class="box-text">Executes surgical DOM update</text>

  <path d="M 270 145 L 330 145" class="arrow-blue" />
  <path d="M 580 145 L 640 145" class="arrow-emerald" />

  <rect x="50" y="240" width="800" height="120" class="box box-amber" />
  <text x="70" y="270" class="box-title">Glitch-Free Topological Clock Algorithm (Diamond Problem Resolution)</text>
  <text x="70" y="295" class="box-text">• When Signal A changes: Marks downstream Computeds (B, C) as potentially stale.</text>
  <text x="70" y="315" class="box-text">• Computed D (dependent on B and C) evaluates strictly after both B and C resolve.</text>
  <text x="70" y="335" class="box-text">• Result: Zero duplicate effect triggers and zero observable intermediate glitch states.</text>
`);

fs.writeFileSync(path.join(outDir, 'Figure2_ReactiveDependencyFlow.svg'), fig2Svg);
fs.writeFileSync(path.join(outDir, 'Figure2_ReactiveDependencyFlow.md'), `### Figure 2: Reactive Dependency and Update Flow

\`\`\`mermaid
flowchart LR
  subgraph Producer["State Producer"]
    S["Signal&lt;T&gt;\\n(Versioned Clock)"]
  end

  subgraph Derivations["Topological Graph"]
    C1["Computed B\\n(Depth 1)"]
    C2["Computed C\\n(Depth 1)"]
    D["Computed D\\n(Depth 2)"]
  end

  subgraph Consumer["Terminal Consumer"]
    E["Effect / Surgical DOM Hole\\n(node.textContent = ...)"]
  end

  S -->|Marks Stale| C1
  S -->|Marks Stale| C2
  C1 -->|Topological Sort| D
  C2 -->|Topological Sort| D
  D -->|Direct Property Mutation| E
\`\`\`
`);

// ---------------------------------------------------------------------------
// Figure 3: Component Lifecycle
// ---------------------------------------------------------------------------
const fig3Svg = createSvgWrapper(900, 440, 'Figure 3: Component Execution and Direct DOM Update Lifecycle', `
  <rect x="40" y="90" width="250" height="120" class="box box-blue" />
  <text x="55" y="115" class="box-title">Step 1: Single Component Execution</text>
  <text x="55" y="135" class="box-text">• Component function runs ONCE at mount</text>
  <text x="55" y="152" class="box-text">• Instantiates Signals &amp; Computeds</text>
  <text x="55" y="170" class="box-text">• Attaches to parent Owner scope</text>
  <text x="55" y="188" class="box-text">• Never re-executes on state changes</text>

  <rect x="330" y="90" width="250" height="120" class="box box-emerald" />
  <text x="345" y="115" class="box-title">Step 2: Template Cloning</text>
  <text x="345" y="135" class="box-text">• Clones static HTML template once</text>
  <text x="345" y="152" class="box-text">• Uses template.content.cloneNode(true)</text>
  <text x="345" y="170" class="box-text">• Resolves dynamic paths (firstChild)</text>
  <text x="345" y="188" class="box-text">• Zero Virtual DOM tree allocation</text>

  <rect x="620" y="90" width="240" height="120" class="box box-purple" />
  <text x="635" y="115" class="box-title">Step 3: Signal Binding</text>
  <text x="635" y="135" class="box-text">• Binds text/attribute to getter closures</text>
  <text x="635" y="152" class="box-text">• bindText(node, () => count.value)</text>
  <text x="635" y="170" class="box-text">• Registers effect with active Owner</text>
  <text x="635" y="188" class="box-text">• Attaches native event listeners</text>

  <path d="M 290 150 L 320 150" class="arrow" />
  <path d="M 580 150 L 610 150" class="arrow" />

  <rect x="40" y="240" width="820" height="160" class="box box-amber" />
  <text x="55" y="270" class="box-title">Subsequent State Mutation (e.g., count.value++)</text>
  <text x="55" y="295" class="box-text">1. User clicks button -> Event handler modifies count.value.</text>
  <text x="55" y="315" class="box-text">2. Topological reactive engine flags active text binding effect as dirty.</text>
  <text x="55" y="335" class="box-text">3. Effect runs in microtask queue -> Executes node.textContent = count.value.</text>
  <text x="55" y="355" class="box-text">4. Invariant: Component body is NOT re-invoked; VDOM tree diffing is completely bypassed.</text>
  <text x="55" y="375" class="box-text">5. On component removal: Owner.dispose() tears down all signal subscriptions in O(1) time.</text>
`);

fs.writeFileSync(path.join(outDir, 'Figure3_ComponentLifecycle.svg'), fig3Svg);
fs.writeFileSync(path.join(outDir, 'Figure3_ComponentLifecycle.md'), `### Figure 3: Component Lifecycle & Surgical DOM Execution

\`\`\`mermaid
sequenceDiagram
  autonumber
  actor User
  participant Comp as Component Setup Function
  participant Tmpl as Static HTML Template
  participant Graph as Reactive Signal Graph
  participant DOM as Native Real DOM Node

  Note over Comp: Executes EXACTLY ONCE
  Comp->>Graph: Initialize signal(0), computed(...)
  Comp->>Tmpl: template.content.cloneNode(true)
  Tmpl-->>Comp: Live DOM tree fragment
  Comp->>Graph: bindText(node, () => count.value)
  Comp->>DOM: Mount fragment to parent container
  
  Note over User,DOM: State Mutation Loop
  User->>DOM: Click [Increment]
  DOM->>Graph: count.value++ (Clock Incremented)
  Graph->>Graph: Topological queue batching
  Graph->>DOM: node.textContent = 1 (Surgical Write)
  Note over Comp: Component function is NEVER re-executed
\`\`\`
`);

// ---------------------------------------------------------------------------
// Figure 4: Compiler Pipeline
// ---------------------------------------------------------------------------
const fig4Svg = createSvgWrapper(900, 380, 'Figure 4: Compiler Pipeline (TSX Source to Surgical Imperative Instructions)', `
  <rect x="40" y="90" width="140" height="80" class="box box-slate" />
  <text x="55" y="125" class="box-title">TSX Source</text>
  <text x="55" y="145" class="box-text">&lt;div&gt;{count}&lt;/div&gt;</text>

  <rect x="210" y="90" width="140" height="80" class="box box-blue" />
  <text x="225" y="125" class="box-title">Lexer &amp; Parser</text>
  <text x="225" y="145" class="box-text">TypeScript AST</text>

  <rect x="380" y="90" width="150" height="80" class="box box-purple" />
  <text x="395" y="120" class="box-title">Semantic Analyzer</text>
  <text x="395" y="140" class="box-text">Static vs Dynamic</text>
  <text x="395" y="155" class="box-text">Security Context</text>

  <rect x="560" y="90" width="140" height="80" class="box box-amber" />
  <text x="575" y="125" class="box-title">AIR Generator</text>
  <text x="575" y="145" class="box-text">Path Slots &amp; Holes</text>

  <rect x="730" y="90" width="140" height="80" class="box box-emerald" />
  <text x="745" y="125" class="box-title">Codegen</text>
  <text x="745" y="145" class="box-text">_template &amp; _bind</text>

  <path d="M 180 130 L 205 130" class="arrow" />
  <path d="M 350 130 L 375 130" class="arrow" />
  <path d="M 530 130 L 555 130" class="arrow" />
  <path d="M 700 130 L 725 130" class="arrow" />

  <rect x="40" y="200" width="830" height="150" class="box box-slate" />
  <text x="55" y="225" class="box-title">Emitted Code Pattern (Zero VDOM Diffing):</text>
  <text x="55" y="250" class="box-text" font-family="monospace">const _tmpl$ = _template("&lt;div class=\\"card\\"&gt;&lt;h3&gt;&lt;/h3&gt;&lt;p&gt;&lt;/p&gt;&lt;/div&gt;"); // Hoisted once</text>
  <text x="55" y="275" class="box-text" font-family="monospace">export function Card(props) {</text>
  <text x="55" y="295" class="box-text" font-family="monospace">  const _el$ = _tmpl$(); const _h3 = _el$.firstChild; const _p = _h3.nextSibling;</text>
  <text x="55" y="315" class="box-text" font-family="monospace">  _bindText(_h3, () => props.title.value); _bindText(_p, () => props.desc.value); return _el$;</text>
  <text x="55" y="335" class="box-text" font-family="monospace">}</text>
`);

fs.writeFileSync(path.join(outDir, 'Figure4_CompilerRuntimePipeline.svg'), fig4Svg);
fs.writeFileSync(path.join(outDir, 'Figure4_CompilerRuntimePipeline.md'), `### Figure 4: Compiler to Runtime Execution Pipeline

\`\`\`mermaid
flowchart TD
  SRC["TypeScript JSX Source\\n<div>{count.value}</div>"]
  PARSER["Parser & AST Extractor\\n(TypeScript AST)"]
  ANALYZER["Semantic & Security Analyzer\\n- Static vs Dynamic Separation\\n- Context Classification (HTML/URI/CSS)"]
  AIR["Samrey Intermediate Representation (AIR)\\n- Hoisted Static Templates\\n- Surgical Dynamic Slots [0, 1]"]
  CODEGEN["Code Generator\\n- _template(...) Hoisting\\n- Path Navigation (firstChild, nextSibling)\\n- _bindText(), _bindAttr()"]
  OUTPUT["Output JavaScript Module\\n(Zero Runtime Compiler Overhead)"]

  SRC --> PARSER --> ANALYZER --> AIR --> CODEGEN --> OUTPUT
\`\`\`
`);

// ---------------------------------------------------------------------------
// Figure 5: SSR Serialization & Hydration
// ---------------------------------------------------------------------------
const fig5Svg = createSvgWrapper(900, 380, 'Figure 5: SSR Streaming & Resumable Micro-Hydration', `
  <rect x="40" y="90" width="250" height="130" class="box box-blue" />
  <text x="55" y="115" class="box-title">1. Server Streaming</text>
  <text x="55" y="135" class="box-text">• Executes route loaders in parallel</text>
  <text x="55" y="152" class="box-text">• Streams shell HTML immediately</text>
  <text x="55" y="170" class="box-text">• Out-of-order chunks via &lt;template&gt;</text>
  <text x="55" y="188" class="box-text">• Zero blocking server render</text>

  <rect x="325" y="90" width="250" height="130" class="box box-amber" />
  <text x="340" y="115" class="box-title">2. Safe State Serialization</text>
  <text x="340" y="135" class="box-text">• JSON serialized with Unicode escapes</text>
  <text x="340" y="152" class="box-text">• &lt; -> \\u003c, &gt; -> \\u003e (Anti-XSS)</text>
  <text x="340" y="170" class="box-text">• Line terminators escaped (\\u2028)</text>
  <text x="340" y="188" class="box-text">• Prototype pollution keys rejected</text>

  <rect x="610" y="90" width="250" height="130" class="box box-emerald" />
  <text x="625" y="115" class="box-title">3. Resumable Hydration</text>
  <text x="625" y="135" class="box-text">• Root event delegator catches clicks</text>
  <text x="625" y="152" class="box-text">• Resumes reactive subscriptions</text>
  <text x="625" y="170" class="box-text">• Zero component body re-render</text>
  <text x="625" y="188" class="box-text">• Replays queued early user clicks</text>

  <path d="M 290 155 L 320 155" class="arrow" />
  <path d="M 575 155 L 605 155" class="arrow" />

  <rect x="40" y="250" width="820" height="100" class="box box-slate" />
  <text x="55" y="275" class="box-title">Comparison vs Traditional Hydration:</text>
  <text x="55" y="300" class="box-text">Traditional VDOM (React/Vue): Client re-runs the entire component tree to generate virtual nodes before attaching listeners.</text>
  <text x="55" y="325" class="box-text">Samrey Resumable: HTML is hydrated in place; component setup is skipped; signals link directly to existing DOM nodes.</text>
`);

fs.writeFileSync(path.join(outDir, 'Figure5_SSRSerializationHydration.svg'), fig5Svg);
fs.writeFileSync(path.join(outDir, 'Figure5_SSRSerializationHydration.md'), `### Figure 5: SSR Streaming & Resumable Micro-Hydration

\`\`\`mermaid
sequenceDiagram
  autonumber
  participant Client as Browser Client
  participant Server as Samrey SSR Engine
  participant Loader as Async Route Data Loader

  Client->>Server: HTTP GET /dashboard
  Server->>Loader: Execute loader() in parallel
  Server-->>Client: Stream 1: Fast HTML Shell + Loading Skeletons
  Note over Client: Shell renders immediately; user sees content
  Loader-->>Server: Data resolved (e.g. 50ms)
  Server-->>Client: Stream 2: <template id="chunk"> + Unicode Serialized State
  Server-->>Client: Stream 3: Inline Swap Script (<script>swap("chunk")</script>)
  Note over Client: Out-of-order swap swaps skeleton with real content
  Client->>Client: hydrate() resumes signal listeners directly without re-rendering
\`\`\`
`);

// ---------------------------------------------------------------------------
// Figure 6: Security Boundary Architecture
// ---------------------------------------------------------------------------
const fig6Svg = createSvgWrapper(900, 380, 'Figure 6: Context-Aware Defensive Security Boundary', `
  <rect x="340" y="80" width="220" height="50" class="box box-indigo" />
  <text x="355" y="110" class="box-title">Dynamic User Input</text>

  <path d="M 370 130 L 100 170" class="arrow" />
  <path d="M 400 130 L 280 170" class="arrow" />
  <path d="M 450 130 L 450 170" class="arrow" />
  <path d="M 500 130 L 620 170" class="arrow" />
  <path d="M 530 130 L 780 170" class="arrow" />

  <rect x="30" y="180" width="150" height="90" class="box box-blue" />
  <text x="45" y="205" class="box-title">1. HTML Text</text>
  <text x="45" y="225" class="box-text">node.textContent</text>
  <text x="45" y="245" class="box-text">HTML parser bypass</text>

  <rect x="200" y="180" width="160" height="90" class="box box-emerald" />
  <text x="215" y="205" class="box-title">2. Safe Attributes</text>
  <text x="215" y="225" class="box-text">setAttribute(k, v)</text>
  <text x="215" y="245" class="box-text">Escapes quotes</text>

  <rect x="380" y="180" width="150" height="90" class="box box-amber" />
  <text x="395" y="205" class="box-title">3. Hyperlinks/URIs</text>
  <text x="395" y="225" class="box-text">sanitizeUri()</text>
  <text x="395" y="245" class="box-text">Blocks javascript:</text>

  <rect x="550" y="180" width="150" height="90" class="box box-purple" />
  <text x="565" y="205" class="box-title">4. CSS Styles</text>
  <text x="565" y="225" class="box-text">CSSOM validator</text>
  <text x="565" y="245" class="box-text">Blocks expression()</text>

  <rect x="720" y="180" width="150" height="90" class="box box-rose" />
  <text x="735" y="205" class="box-title">5. Raw Markup</text>
  <text x="735" y="225" class="box-text">W3C Trusted Types</text>
  <text x="735" y="245" class="box-text">samrey#html policy</text>

  <rect x="30" y="295" width="840" height="60" class="box box-slate" />
  <text x="50" y="320" class="box-title">Zero-Eval Guarantee: Prohibits eval(), new Function(), and string script injections across all 11 packages.</text>
  <text x="50" y="338" class="box-text">Full compatibility with strict Content Security Policy (CSP): script-src 'self' (No 'unsafe-eval' or 'unsafe-inline' needed).</text>
`);

fs.writeFileSync(path.join(outDir, 'Figure6_SecurityBoundary.svg'), fig6Svg);
fs.writeFileSync(path.join(outDir, 'Figure6_SecurityBoundary.md'), `### Figure 6: Context-Aware Defensive Security Boundary

\`\`\`mermaid
flowchart TD
  INPUT["Dynamic Untrusted Input"]

  subgraph Classifier["Compile-Time Context Classifier"]
    C_TEXT["HTML Body Text"]
    C_ATTR["Element Attribute"]
    C_URI["URI / Link / Iframe"]
    C_CSS["Inline CSS Style"]
    C_RAW["Explicit SafeHtml Component"]
  end

  subgraph Defense["Runtime Sanitization & Defense"]
    D_TEXT["node.textContent = value\\n(HTML Parser Completely Bypassed)"]
    D_ATTR["node.setAttribute(key, value)\\n(Direct Attribute Property Mapping)"]
    D_URI["sanitizeUri(value)\\n(Blocks javascript:, data:; Neutralizes to about:blank)"]
    D_CSS["sanitizeCssStyle(value)\\n(CSSOM Identifier Validation; Blocks expression(), url())"]
    D_RAW["W3C Trusted Types Policy\\n(window.trustedTypes.createPolicy('samrey#html'))"]
  end

  INPUT --> C_TEXT --> D_TEXT
  INPUT --> C_ATTR --> D_ATTR
  INPUT --> C_URI --> D_URI
  INPUT --> C_CSS --> D_CSS
  INPUT --> C_RAW --> D_RAW
\`\`\`
`);

// ---------------------------------------------------------------------------
// Figure 7: Package Dependency Graph
// ---------------------------------------------------------------------------
const fig7Svg = createSvgWrapper(900, 440, 'Figure 7: Samrey Monorepo Package Dependency Topology (Strict DAG)', `
  <!-- CLI & DevTools (Top) -->
  <rect x="150" y="80" width="220" height="45" class="box box-indigo" />
  <text x="170" y="108" class="box-title">@samrey/cli</text>

  <rect x="530" y="80" width="220" height="45" class="box box-indigo" />
  <text x="550" y="108" class="box-title">@samrey/devtools</text>

  <!-- Compiler & App Infra (Middle-Top) -->
  <rect x="50" y="160" width="200" height="45" class="box box-blue" />
  <text x="70" y="188" class="box-title">@samrey/compiler</text>

  <rect x="270" y="160" width="180" height="45" class="box box-blue" />
  <text x="290" y="188" class="box-title">@samrey/router</text>

  <rect x="470" y="160" width="180" height="45" class="box box-blue" />
  <text x="490" y="188" class="box-title">@samrey/forms</text>

  <rect x="670" y="160" width="180" height="45" class="box box-blue" />
  <text x="690" y="188" class="box-title">@samrey/ssr</text>

  <!-- HTTP & Testing (Middle-Bottom) -->
  <rect x="180" y="245" width="200" height="45" class="box box-slate" />
  <text x="200" y="273" class="box-title">@samrey/http</text>

  <rect x="520" y="245" width="200" height="45" class="box box-slate" />
  <text x="540" y="273" class="box-title">@samrey/testing</text>

  <!-- Runtime (Lower) -->
  <rect x="330" y="320" width="240" height="45" class="box box-emerald" />
  <text x="350" y="348" class="box-title">@samrey/runtime</text>

  <!-- Base Foundational (Bottom) -->
  <rect x="100" y="390" width="300" height="40" class="box box-amber" />
  <text x="120" y="415" class="box-title">@samrey/reactivity (0 Dependencies)</text>

  <rect x="500" y="390" width="300" height="40" class="box box-amber" />
  <text x="520" y="415" class="box-title">@samrey/security (0 Dependencies)</text>

  <!-- Arrows -->
  <path d="M 260 125 L 150 160" class="arrow" />
  <path d="M 640 125 L 250 390" class="arrow" />
  <path d="M 450 365 L 250 390" class="arrow" />
  <path d="M 450 365 L 650 390" class="arrow" />
`);

fs.writeFileSync(path.join(outDir, 'Figure7_PackageDependencyGraph.svg'), fig7Svg);
fs.writeFileSync(path.join(outDir, 'Figure7_PackageDependencyGraph.md'), `### Figure 7: Samrey Monorepo Package Dependency Topology

\`\`\`mermaid
flowchart TD
  subgraph T3["Tooling & Verification"]
    CLI["@samrey/cli"]
    DEVTOOLS["@samrey/devtools"]
    TESTING["@samrey/testing"]
  end

  subgraph T2["Application Infrastructure"]
    ROUTER["@samrey/router"]
    FORMS["@samrey/forms"]
    HTTP["@samrey/http"]
    SSR["@samrey/ssr"]
  end

  subgraph T1["Core Compilation & Runtime"]
    COMPILER["@samrey/compiler"]
    RUNTIME["@samrey/runtime"]
  end

  subgraph T0["Foundational Leaves (Zero Dependencies)"]
    REACTIVITY["@samrey/reactivity"]
    SECURITY["@samrey/security"]
  end

  CLI --> COMPILER
  COMPILER --> SECURITY

  DEVTOOLS --> REACTIVITY
  TESTING --> RUNTIME
  TESTING --> REACTIVITY

  ROUTER --> RUNTIME
  ROUTER --> REACTIVITY
  ROUTER --> SECURITY

  FORMS --> RUNTIME
  FORMS --> REACTIVITY

  HTTP --> REACTIVITY
  HTTP --> SECURITY

  SSR --> REACTIVITY
  SSR --> SECURITY

  RUNTIME --> REACTIVITY
  RUNTIME --> SECURITY
\`\`\`
`);

// ---------------------------------------------------------------------------
// Figure 8: Developer Assistant Architecture
// ---------------------------------------------------------------------------
const fig8Svg = createSvgWrapper(900, 420, 'Figure 8: Developer Assistant & Grounded Knowledge Engine Architecture', `
  <rect x="40" y="80" width="820" height="70" class="box box-indigo" />
  <text x="60" y="110" class="box-title">Unified Developer Input (Questions, How-To, Code, Bug Reports, AETH Errors)</text>
  <text x="60" y="130" class="box-text">Auto-Intent Detection: QUESTION | HOW_TO | REQUIREMENT | DEBUG | CONVERT | ERROR | ARCHITECTURE | API_LOOKUP</text>

  <rect x="40" y="175" width="390" height="130" class="box box-blue" />
  <text x="60" y="200" class="box-title">Deterministic Grounded Engine</text>
  <text x="60" y="220" class="box-text">• Frozen PUBLIC_API.md verification</text>
  <text x="60" y="238" class="box-text">• Subsystem Error Registry (AETH-001 to 899)</text>
  <text x="60" y="256" class="box-text">• Implementation Recipe Catalog (19 categories)</text>
  <text x="60" y="274" class="box-text">• Zero hallucinated symbol guarantee</text>

  <rect x="470" y="175" width="390" height="130" class="box box-purple" />
  <text x="490" y="200" class="box-title">Smart LLM Provider + Grounded Context</text>
  <text x="490" y="220" class="box-text">• Server-side Gemini API provider</text>
  <text x="490" y="238" class="box-text">• Injects retrieved repository specifications</text>
  <text x="490" y="256" class="box-text">• Foreign framework detection (React/Vue/Svelte)</text>
  <text x="490" y="274" class="box-text">• Fallback to deterministic catalog on offline</text>

  <rect x="40" y="325" width="820" height="75" class="box box-emerald" />
  <text x="60" y="350" class="box-title">AST Code Validator &amp; Live Runtime Sandbox</text>
  <text x="60" y="370" class="box-text">• Validates code against official @samrey/* exports (shows ✓ Samrey v1.0.0 Verified ONLY on pass)</text>
  <text x="60" y="388" class="box-text">• In-browser live execution sandbox transpiles TypeScript and mounts native DOM nodes</text>
`);

fs.writeFileSync(path.join(outDir, 'Figure8_DeveloperAssistantArchitecture.svg'), fig8Svg);
fs.writeFileSync(path.join(outDir, 'Figure8_DeveloperAssistantArchitecture.md'), `### Figure 8: Developer Assistant Architecture

\`\`\`mermaid
flowchart TD
  INPUT["Unified Developer Input\\n(Question, Code Bug, Feature Requirement, AETH Error)"]
  INTENT["Intent Classification Engine\\n(8 Supported Intent Types)"]

  subgraph Retrieval["Grounded Knowledge & Retrieval"]
    KB["Frozen Public API & Spec Catalog\\n(docs/PUBLIC_API.md)"]
    ERRORS["AETH Subsystem Error Registry\\n(AETH-001 to 899)"]
    RECIPES["Implementation Recipe Catalog\\n(19 Standardized Blueprints)"]
  end

  subgraph Synthesis["Synthesis & AST Validation"]
    SMART["Smart Provider (LLM + Injected Specs)\\n/ Deterministic Knowledge Engine"]
    VALIDATOR["AST Code Validator\\n- Symbol Audit against @samrey/*\\n- Stale Closure Audit\\n- Foreign Framework Interceptor"]
  end

  subgraph Sandbox["Interactive Live Sandbox"]
    PLAYGROUND["In-Browser Runtime Sandbox\\n(In-Memory Transpiler + Native Reactive Mount)"]
  end

  INPUT --> INTENT
  INTENT --> Retrieval
  Retrieval --> Synthesis
  Synthesis --> VALIDATOR
  VALIDATOR -->|Verified Solution| PLAYGROUND
\`\`\`
`);

// ---------------------------------------------------------------------------
// Figure 9: Assistant Flow to Playground
// ---------------------------------------------------------------------------
const fig9Svg = createSvgWrapper(900, 380, 'Figure 9: Question to Intent, Grounded Synthesis, and Live Sandbox Flow', `
  <rect x="40" y="90" width="140" height="90" class="box box-slate" />
  <text x="55" y="115" class="box-title">1. Developer</text>
  <text x="55" y="135" class="box-text">"Search box with</text>
  <text x="55" y="152" class="box-text">300ms debounce</text>
  <text x="55" y="170" class="box-text">&amp; cancellation"</text>

  <rect x="210" y="90" width="140" height="90" class="box box-blue" />
  <text x="225" y="115" class="box-title">2. Classifier</text>
  <text x="225" y="135" class="box-text">Intent:</text>
  <text x="225" y="152" class="box-text">REQUIREMENT</text>
  <text x="225" y="170" class="box-text">Tags: HTTP, Sig</text>

  <rect x="380" y="90" width="150" height="90" class="box box-purple" />
  <text x="395" y="115" class="box-title">3. Synthesis</text>
  <text x="395" y="135" class="box-text">Grounding with</text>
  <text x="395" y="152" class="box-text">@samrey/http &amp;</text>
  <text x="395" y="170" class="box-text">@samrey/reactivity</text>

  <rect x="560" y="90" width="140" height="90" class="box box-amber" />
  <text x="575" y="115" class="box-title">4. AST Audit</text>
  <text x="575" y="135" class="box-text">Symbols: Valid</text>
  <text x="575" y="152" class="box-text">Foreign APIs: 0</text>
  <text x="575" y="170" class="box-text">Badge: Verified</text>

  <rect x="730" y="90" width="140" height="90" class="box box-emerald" />
  <text x="745" y="115" class="box-title">5. Playground</text>
  <text x="745" y="135" class="box-text">Live DOM Mount</text>
  <text x="745" y="152" class="box-text">Type-Strip Transpile</text>
  <text x="745" y="170" class="box-text">Interactive Demo</text>

  <path d="M 180 135 L 205 135" class="arrow" />
  <path d="M 350 135 L 375 135" class="arrow" />
  <path d="M 530 135 L 555 135" class="arrow" />
  <path d="M 700 135 L 725 135" class="arrow" />

  <rect x="40" y="210" width="830" height="140" class="box box-slate" />
  <text x="55" y="235" class="box-title">Generated Solution Contract:</text>
  <text x="55" y="260" class="box-text">1. Answer: Direct explanation of debounced reactive query timing and async cancellation.</text>
  <text x="55" y="280" class="box-text">2. Implementation: Runnable TypeScript utilizing signal(), onCleanup(), and createHttpClient().</text>
  <text x="55" y="300" class="box-text">3. Verification: Automatic AST parse + typecheck verifies zero React hooks or invalid APIs.</text>
  <text x="55" y="320" class="box-text">4. Live Execution: [▶ Try in Playground] loads the code directly into the in-memory execution sandbox.</text>
`);

fs.writeFileSync(path.join(outDir, 'Figure9_AssistantIntentPlaygroundFlow.svg'), fig9Svg);
fs.writeFileSync(path.join(outDir, 'Figure9_AssistantIntentPlaygroundFlow.md'), `### Figure 9: Developer Workflow Pipeline

\`\`\`mermaid
sequenceDiagram
  autonumber
  actor Dev as Developer
  participant UI as Unified Assistant UI
  participant Intent as Intent Classifier
  participant Engine as Grounded Knowledge Engine
  participant Audit as AST Code Auditor
  participant Sand as In-Browser Sandbox

  Dev->>UI: Types requirement or pastes broken code
  UI->>Intent: Classify intent (e.g. REQUIREMENT / DEBUG)
  Intent->>Engine: Retrieve authoritative @samrey/* specs
  Engine-->>UI: Structured 6-part response (Answer, Approach, Code, Why, APIs, Audit)
  UI->>Audit: Run AST symbol & safety audit
  Audit-->>UI: "✓ Samrey v1.0.0 Verified" (Zero hallucinations)
  Dev->>UI: Clicks [▶ Try in Playground]
  UI->>Sand: Transpile TypeScript & initialize reactive owner
  Sand->>Sand: Mount live native DOM nodes
  Sand-->>Dev: Interactive executing application with live signal state
\`\`\`
`);

// ---------------------------------------------------------------------------
// Figure 10: Blind Developer Challenge Benchmark Pipeline
// ---------------------------------------------------------------------------
const fig10Svg = createSvgWrapper(900, 400, 'Figure 10: Blind Developer Challenge Benchmark Evaluation Pipeline', `
  <rect x="40" y="90" width="250" height="120" class="box box-blue" />
  <text x="55" y="115" class="box-title">Phase A: Challenge Generation</text>
  <text x="55" y="135" class="box-text">• 20 frozen unseen scenarios</text>
  <text x="55" y="152" class="box-text">• Varied wording; no FAQ copy</text>
  <text x="55" y="170" class="box-text">• Spans all 11 monorepo packages</text>
  <text x="55" y="188" class="box-text">• Isolated context per challenge</text>

  <rect x="325" y="90" width="250" height="120" class="box box-purple" />
  <text x="340" y="115" class="box-title">Phase B: Autonomous Answer</text>
  <text x="340" y="135" class="box-text">• Fresh instance of provider</text>
  <text x="340" y="152" class="box-text">• ZERO predefined answers</text>
  <text x="340" y="170" class="box-text">• Real-time intent detection</text>
  <text x="340" y="188" class="box-text">• Full runnable code synthesis</text>

  <rect x="610" y="90" width="250" height="120" class="box box-emerald" />
  <text x="625" y="115" class="box-title">Phase C: Static &amp; AST Audit</text>
  <text x="625" y="135" class="box-text">• TypeScript compilation check</text>
  <text x="625" y="152" class="box-text">• Symbol audit (0 hallucinations)</text>
  <text x="625" y="170" class="box-text">• Foreign framework scan (0 hooks)</text>
  <text x="625" y="188" class="box-text">• Lifecycle cleanup verification</text>

  <path d="M 290 150 L 320 150" class="arrow" />
  <path d="M 575 150 L 605 150" class="arrow" />

  <rect x="40" y="240" width="820" height="135" class="box box-amber" />
  <text x="55" y="265" class="box-title">Phase D: 6-Dimensional Rubric Scoring (0–5 pts per dimension, Max 30 pts per challenge)</text>
  <text x="55" y="290" class="box-text">1. Concept Accuracy (5/5) | 2. API Accuracy (5/5) | 3. Code Quality (5/5)</text>
  <text x="55" y="310" class="box-text">4. Compilation &amp; Transpilation (5/5) | 5. Task Completeness (5/5) | 6. Samrey-Native Invariants (5/5)</text>
  <text x="55" y="335" class="box-text">Result: 582 / 600 total points (97.0%) | 100% TS Compiles | 100% API Accuracy | 0% Hallucinations</text>
`);

fs.writeFileSync(path.join(outDir, 'Figure10_BlindChallengePipeline.svg'), fig10Svg);
fs.writeFileSync(path.join(outDir, 'Figure10_BlindChallengePipeline.md'), `### Figure 10: Blind Developer Challenge Benchmark Pipeline

\`\`\`mermaid
flowchart LR
  subgraph PhaseA["Phase A: Challenge Isolation"]
    CH["20 Frozen Unseen Scenarios\\n(Clean Isolated Context)"]
  end

  subgraph PhaseB["Phase B: Answer Generation"]
    GEN["Autonomous Synthesis\\n- Zero Predefined Answers\\n- Public API Grounding"]
  end

  subgraph PhaseC["Phase C: Automated Verification"]
    TSC["TypeScript Typecheck & Transpile"]
    AST["AST Symbol Audit\\n(Hallucination & Foreign Scan)"]
    RT["Runtime Execution Validation"]
  end

  subgraph PhaseD["Phase D: Quantitative Scoring"]
    SCORE["6-Dimensional Rubric (0-30 pts)\\nTotal: 582/600 (97.0%)"]
  end

  CH --> GEN --> TSC --> AST --> RT --> SCORE
\`\`\`
`);

console.log('Successfully generated all 10 figures in SVG and Markdown format!');
