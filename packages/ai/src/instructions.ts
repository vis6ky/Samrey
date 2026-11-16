/**
 * @license Apache-2.0
 * @samrey/ai - Universal AI Instructions Generator
 */

import * as fs from 'node:fs';
import * as path from 'node:path';

export function getAuthoritativeInstructionContent(): string {
  return `# Samrey Framework — Universal AI Development Instructions (AGENTS.md)

> **Authority**: This document and the \`ai/\` specification directory constitute the **Single Source of Truth** for all autonomous coding agents, LLMs, and AI tools developing in Samrey.

---

## 0. Canonical Specification Hierarchy (\`ai/\` Single Source of Truth)

All agents must adhere to the detailed rules defined in the \`ai/\` specification suite:
- [ai/SPEC.md](ai/SPEC.md): Core framework specification & design invariants
- [ai/ARCHITECTURE.md](ai/ARCHITECTURE.md): Zero-VDOM execution lifecycle & system architecture
- [ai/API_CONTRACTS.md](ai/API_CONTRACTS.md): Authoritative public API contracts across all 13 \`@samrey/*\` packages
- [ai/REACTIVITY_RULES.md](ai/REACTIVITY_RULES.md): Signals, computed, effects, stores, and owner hierarchy rules
- [ai/COMPONENT_RULES.md](ai/COMPONENT_RULES.md): Static template cloning (\`template()\`), \`.refs\`, surgical bindings, and control flow functions
- [ai/COMPILER_RULES.md](ai/COMPILER_RULES.md): AIR intermediate representation, static hoisting, and diagnostic codes
- [ai/ROUTING_RULES.md](ai/ROUTING_RULES.md): Client-side routing, outlets, links, and navigation guards
- [ai/SSR_RULES.md](ai/SSR_RULES.md): Streaming SSR, hydration, event delegation, and serialization
- [ai/SECURITY_RULES.md](ai/SECURITY_RULES.md): Contextual sanitizers, Trusted Types, anti-CSRF, and secrets redaction
- [ai/TESTING_RULES.md](ai/TESTING_RULES.md): Headless DOM test harness, event simulation, and reactivity flushing
- [ai/ERROR_REFERENCE.md](ai/ERROR_REFERENCE.md): Searchable catalog of error codes \`SAMREY-101\` through \`SAMREY-501\`
- [ai/EXAMPLES_INDEX.md](ai/EXAMPLES_INDEX.md): Verified production code examples catalog
- [ai/VERSION_COMPATIBILITY.md](ai/VERSION_COMPATIBILITY.md): SemVer and runtime compatibility matrix

For vendor-specific instructions:
- Anthropic Claude / Claude Code: See [CLAUDE.md](CLAUDE.md)
- Google Gemini / Gemini CLI: See [GEMINI.md](GEMINI.md)
- GitHub Copilot: See [.github/copilot-instructions.md](.github/copilot-instructions.md)
- Cursor: See [.cursor/rules/samrey.mdc](.cursor/rules/samrey.mdc)

---

## 1. What is Samrey?
Samrey is an independent, compile-time reactive frontend framework engineered for high performance.
- **Zero Virtual DOM**: Components run **EXACTLY ONCE** during creation. There is no VDOM diffing or reconciliation pass.
- **Compile-Time Static Hoisting**: Invariant HTML markup is hoisted into \`template("...")\` cloning operations (\`_tmpl$1 = template("<div>...</div>")\`).
- **Surgical Fine-Grained Bindings**: State changes trigger microscopic surgical DOM updates (\`bindText\`, \`bindAttr\`, \`on\`) without re-running component functions.
- **Pure Signals**: Reactive state is managed via \`signal()\`, \`computed()\`, \`effect()\`, and \`createStore()\` from \`@samrey/reactivity\`.

---

## 2. Prohibited Foreign Framework Idioms (STRICT)
- ❌ **NEVER use React hooks** (\`useState\`, \`useEffect\`, \`useMemo\`, \`useCallback\`, \`useRef\`, \`useContext\`). Samrey is NOT React.
- ❌ **NEVER mutate signal arrays or objects in-place** (e.g. \`todos.value.push(x)\` will NOT trigger reactivity). Always reassign a new reference: \`todos.value = [...todos.value, x]\` or use \`todos.update(arr => [...arr, x])\`.
- ❌ **NEVER write \`<Show>\` or \`<For>\` as template HTML tags** in string templates or raw HTML (this triggers compiler error \`SAMREY-108\`).
- ❌ **NEVER import React or Vue libraries**.

---

## 3. Core Development Workflows & Real APIs

### A. Creating an Application
\`\`\`bash
# Create a new production Samrey app
npx @samrey/cli create my-app --template ssr
cd my-app
npm install
npm run dev
\`\`\`

### B. Reactive State & Computations
\`\`\`ts
import { signal, computed, effect, batch } from '@samrey/reactivity';

// 1. Primitive Signal
const count = signal(0);
console.log(count.value); // Read with .value
count.value++;            // Write with .value =
count.set(10);           // Or .set()
count.update(n => n + 1); // Or .update()

// 2. Derived Computed Value
const double = computed(() => count.value * 2);

// 3. Side Effects
effect(() => {
  console.log(\`Current count is \${count.value}, double is \${double.value}\`);
});

// 4. Batching Multiple Mutations
batch(() => {
  count.value = 100;
  // effects run once after batch completes
});
\`\`\`

### C. Creating Components & Surgical DOM Bindings
\`\`\`ts
import { signal } from '@samrey/reactivity';
import { template, on, bindText } from '@samrey/runtime';

// Hoisted static template with Template References (Samrey 2.1.0)
const _tmpl = template('<button ref="btn" class="btn">Count: <span ref="num" class="num"></span></button>');

export function Counter(props: { initial?: number }) {
  const count = signal(props.initial ?? 0);
  const root = _tmpl.clone();
  const { btn, num } = root.refs;

  // Surgical text node update — only this span updates when count changes
  bindText(num, () => count.value.toString());

  // Event handler
  on(btn, 'click', () => count.update(n => n + 1));

  return root;
}
\`\`\`

### D. Conditional Rendering (\`Show\`)
\`\`\`ts
import { signal } from '@samrey/reactivity';
import { Show, template } from '@samrey/runtime';

const _userTmpl = template('<div class="profile">Welcome, User!</div>');
const _guestTmpl = template('<div class="guest">Please sign in.</div>');

export function AuthSection() {
  const isAuth = signal(false);

  return Show({
    when: () => isAuth.value,
    children: () => _userTmpl(),
    fallback: () => _guestTmpl()
  });
}
\`\`\`

### E. List Rendering (\`For\`)
\`\`\`ts
import { signal } from '@samrey/reactivity';
import { For, template, bindText } from '@samrey/runtime';

interface Item { id: number; name: string; }

const _itemTmpl = template('<li class="item-row"><span class="txt"></span></li>');

export function ItemList() {
  const items = signal<Item[]>([
    { id: 1, name: 'Item Alpha' },
    { id: 2, name: 'Item Beta' }
  ]);

  return For({
    each: () => items.value,
    key: (item) => item.id,
    children: (item) => {
      const row = _itemTmpl() as HTMLElement;
      bindText(row.querySelector('.txt')!, () => item.name);
      return row;
    }
  });
}
\`\`\`

### F. Client-Side Routing
\`\`\`ts
import { createRouter, RouterOutlet, Link, useParams } from '@samrey/router';
import { template } from '@samrey/runtime';

function Home() { return template('<div>Home Page</div>')(); }
function Dashboard() { return template('<div>Dashboard Page</div>')(); }

export const router = createRouter([
  { path: '/', component: Home },
  { path: '/dashboard', component: Dashboard }
]);

export function Navigation() {
  const nav = template('<nav><div class="nav-links"></div><main></main></nav>')() as HTMLElement;
  nav.querySelector('.nav-links')!.appendChild(Link({ href: '/', children: 'Home' }));
  nav.querySelector('.nav-links')!.appendChild(Link({ href: '/dashboard', children: 'Dashboard' }));
  nav.querySelector('main')!.appendChild(RouterOutlet());
  return nav;
}
\`\`\`

### G. Async Data Fetching (\`createResource\`)
\`\`\`ts
import { createResource } from '@samrey/http';
import { Show, template, bindText } from '@samrey/runtime';

export function UserList() {
  const [users] = createResource(async () => {
    const res = await fetch('/api/users');
    return res.json();
  });

  return Show({
    when: () => users.loading.value,
    children: () => template('<div>Loading users...</div>')(),
    fallback: () => template('<div>Data loaded!</div>')()
  });
}
\`\`\`

### H. Forms & Validation
\`\`\`ts
import { createForm } from '@samrey/forms';

const form = createForm({
  initialValues: { email: '', password: '' },
  validate: (values) => {
    const errors: Record<string, string> = {};
    if (!values.email.includes('@')) errors.email = 'Valid email is required';
    return errors;
  },
  onSubmit: async (values) => {
    await login(values);
  }
});
\`\`\`

### I. Component Unit Testing
\`\`\`ts
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { renderTest, fireEvent, flushReactivity } from '@samrey/testing';
import { Counter } from './Counter.js';

describe('Counter', () => {
  it('increments count on click', async () => {
    const { container } = renderTest(() => Counter({ initial: 0 }));
    const btn = container.querySelector('button')!;
    fireEvent(btn, 'click');
    await flushReactivity();
    assert.ok(btn.textContent?.includes('1'));
  });
});
\`\`\`

### J. Production Build & Quality Auditing
\`\`\`bash
# Run security & a11y audit
npx @samrey/cli audit

# Run test suite
npx @samrey/cli test

# Build production bundle
npx @samrey/cli build

# Inspect bundle file sizes
npx @samrey/cli analyze
\`\`\`
`;
}

export function generateAgentsMd(): string {
  return getAuthoritativeInstructionContent();
}

export function generateGeminiMd(): string {
  return `# Google Gemini & Gemini CLI Instructions — Samrey Framework (GEMINI.md)

> **Role**: Guidance tailored for Google Gemini models (Gemini 1.5 Pro, Gemini 2.0 Flash, Gemini CLI, Google AI Studio, and Antigravity) developing applications in Samrey.

---

## 1. Single Source of Truth
Gemini must treat [AGENTS.md](AGENTS.md) and the [ai/](ai/) canonical specification directory as the authoritative reference:
- [ai/SPEC.md](ai/SPEC.md): Core framework contracts & zero-VDOM invariants
- [ai/ARCHITECTURE.md](ai/ARCHITECTURE.md): System architecture & execution lifecycle
- [ai/API_CONTRACTS.md](ai/API_CONTRACTS.md): Verified public APIs across all 13 \`@samrey/*\` packages
- [ai/COMPONENT_RULES.md](ai/COMPONENT_RULES.md): Component construction, template hoisting, and surgical bindings
- [ai/ERROR_REFERENCE.md](ai/ERROR_REFERENCE.md): Diagnostic codes \`SAMREY-101\` to \`SAMREY-501\`

---

## 2. Gemini-Specific Execution & Prompt Optimizations

### Context Caching & Rule Precedence
- When working in large multi-turn sessions, rely on the cached rules in \`ai/*.md\`.
- Never invent speculative APIs or assume React conventions. Samrey components execute **EXACTLY ONCE** on instantiation.

### Tool Use & CLI Execution
When executing shell operations via Antigravity or Gemini CLI:
- Run non-destructive verification: \`npx @samrey/cli check --json\`
- Inspect errors: \`npx @samrey/cli explain <error-code> --json\`
- Run test suites: \`npx @samrey/cli test\`
- Build for production: \`npx @samrey/cli build\`

### Structured Generation Format
When generating components for the user, emit:
1. Static hoisted template (\`template('<... ref="id" ...>')\`).
2. Component factory function accepting typed \`props\`.
3. Surgical bindings (\`bindText\`, \`bindAttr\`, \`on\`).
4. Companion test file using \`@samrey/testing\` (\`renderTest\`, \`fireEvent\`, \`flushReactivity\`).

---

## 3. Strict Prohibitions
- ❌ **NEVER import React, Vue, or Angular libraries**.
- ❌ **NEVER use React hooks** (\`useState\`, \`useEffect\`, etc.).
- ❌ **NEVER mutate signal arrays or objects in-place** (\`todos.value.push(x)\`).
- ❌ **NEVER write \`<Show>\` or \`<For>\` as template HTML tags**.
- ❌ **NEVER call signals as functions** (\`count()\`).
`;
}

export function generateClaudeMd(): string {
  return `# Claude & Claude Code Instructions — Samrey Framework (CLAUDE.md)

> **Role**: Guidance tailored for Anthropic Claude (Claude 3.5 Sonnet, Claude 3 Opus) and the Claude Code CLI working within the Samrey framework repository.

---

## 1. Authoritative Specification
Always refer to the single source of truth in [AGENTS.md](AGENTS.md) and the comprehensive [ai/](ai/) specification directory:
- [ai/SPEC.md](ai/SPEC.md): Core framework contracts & zero-VDOM invariants
- [ai/API_CONTRACTS.md](ai/API_CONTRACTS.md): Verified public APIs across all 13 \`@samrey/*\` packages
- [ai/ERROR_REFERENCE.md](ai/ERROR_REFERENCE.md): Diagnostic codes \`SAMREY-101\` to \`SAMREY-501\`
- [ai/EXAMPLES_INDEX.md](ai/EXAMPLES_INDEX.md): Production code examples

---

## 2. Claude-Specific Workflow Optimizations

### Model Context Protocol (MCP) Integration
When running in Claude Code or Claude Desktop with MCP enabled, invoke \`@samrey/mcp-server\` tools to inspect code and validate architecture:
\`\`\`json
{
  "mcpServers": {
    "samrey": {
      "command": "npx",
      "args": ["@samrey/mcp-server"]
    }
  }
}
\`\`\`
Key MCP Tools:
- \`samrey_get_project_context\`: Discover active routes, packages, and workspace layout in a single round-trip.
- \`samrey_get_api_contracts\`: Inspect accurate TypeScript signatures before generating code.
- \`samrey_validate_code\`: Verify syntax and catch foreign framework idioms (React hooks, \`<Show>\` HTML tags) prior to writing files.
- \`samrey_diagnose_errors\`: Diagnose and retrieve quick-fixes for compiler errors.

### Subagent & Task Delegation
When coordinating multi-step architectural migrations or complex feature development:
1. Use subagents or targeted tool calls for targeted file reads (\`ai/API_CONTRACTS.md\`, \`ai/COMPONENT_RULES.md\`).
2. Always write tests alongside components using \`@samrey/testing\`.
3. Verify changes with \`npx @samrey/cli test\` and \`npx @samrey/cli check\`.

---

## 3. Strict Rules & Anti-Patterns
- ❌ **NEVER use React hooks** (\`useState\`, \`useEffect\`, \`useMemo\`, \`useCallback\`, \`useRef\`, \`useContext\`).
- ❌ **NEVER write \`<Show>\` or \`<For>\` as HTML tags**. They are TypeScript functions: \`Show({ when, children })\`, \`For({ each, key, children })\`.
- ❌ **NEVER mutate signals in-place** (\`arr.value.push(x)\`). Always reassign \`arr.value = [...arr.value, x]\`.
- ❌ **NEVER call signals as functions** (\`count()\`). Access via \`.value\` property.
`;
}

export function generateCopilotInstructions(): string {
  return `# GitHub Copilot Repository Instructions for Samrey

You are assisting developers writing code for **Samrey**, an independent high-performance reactive web framework.
Always consult the canonical specification in [AGENTS.md](../AGENTS.md) and [ai/SPEC.md](../ai/SPEC.md).

## Critical Autocomplete & Generation Rules

1. **Zero Virtual DOM**: Component functions execute **EXACTLY ONCE**. Never suggest React-style hooks (\`useState\`, \`useEffect\`, \`useCallback\`, \`useRef\`).
2. **Reactivity**:
   - Primitive state: \`signal(initialValue)\` from \`@samrey/reactivity\`. Read with \`.value\`, write with \`.value = next\` or \`.update(fn)\`.
   - Derived state: \`computed(() => expr)\`.
   - Side effects: \`effect(() => { ... })\`.
   - Stores: \`createStore(initialObject)\`. Mutate with \`produce(state, draft => { ... })\`.
3. **Templates & DOM**:
   - Always hoist invariant HTML templates at module scope using \`template('...')\` from \`@samrey/runtime\`.
   - Use \`ref="name"\` for element targets: \`const root = _tmpl.clone(); const { name } = root.refs;\`.
   - Bind dynamically with \`bindText\`, \`bindAttr\`, \`bindClass\`, \`bindStyle\`, \`on\`.
4. **Control Flow**:
   - Conditional: \`Show({ when: () => cond.value, children: () => View(), fallback: () => Fallback() })\`.
   - Keyed list: \`For({ each: () => items.value, key: i => i.id, children: (item) => Row(item) })\`.
   - Do NOT emit \`<Show>\` or \`<For>\` as HTML tags.
`;
}

export function generateCursorMdc(): string {
  return `---
description: Comprehensive rules for Samrey framework development, reactivity, and components
globs: **/*.{ts,tsx,js,jsx}
---

# Samrey Framework — Cursor AI Rules

Always consult the canonical specification in \`AGENTS.md\` and \`ai/SPEC.md\`.

## Key Invariants
- **Zero VDOM**: Components execute once during creation.
- **Signals**: Use \`signal()\`, \`computed()\`, \`effect()\` from \`@samrey/reactivity\`. Read with \`.value\`.
- **Hoisting**: Invariant markup is hoisted into \`template('<... ref="id" ...>')\` at module scope.
- **Surgical Updates**: Use \`bindText\`, \`bindAttr\`, \`bindClass\`, \`bindStyle\`, \`on\` from \`@samrey/runtime\`.
- **Control Flow**: \`Show\` and \`For\` are functions, never HTML tags.
- **Prohibited**: Never use React hooks (\`useState\`, \`useEffect\`), never mutate signals in-place (\`arr.value.push(x)\`), never call signals as functions (\`count()\`).
`;
}

export function writeAllInstructions(projectRoot = process.cwd(), force = false): string[] {
  const writtenFiles: string[] = [];
  const root = path.resolve(projectRoot);

  const targets = [
    { filePath: path.join(root, 'AGENTS.md'), content: generateAgentsMd() },
    { filePath: path.join(root, 'GEMINI.md'), content: generateGeminiMd() },
    { filePath: path.join(root, 'CLAUDE.md'), content: generateClaudeMd() },
    { filePath: path.join(root, '.github', 'copilot-instructions.md'), content: generateCopilotInstructions() },
    { filePath: path.join(root, '.cursor', 'rules', 'samrey.mdc'), content: generateCursorMdc() }
  ];

  for (const { filePath, content } of targets) {
    if (!force && fs.existsSync(filePath)) {
      continue;
    }
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(filePath, content, 'utf8');
    writtenFiles.push(filePath);
  }

  return writtenFiles;
}
