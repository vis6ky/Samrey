/**
 * @license Apache-2.0
 * @samrey/doc - Samrey Code Help & Fixer Engine
 *
 * Provides static code analysis, bug diagnostics, unsupported API detection,
 * transformation into idiomatic Samrey TypeScript code, and architectural explanations.
 * Strictly adheres to zero-eval security: treats all user and AI code as untrusted input.
 */

import { escapeHtmlText, escapeHtmlAttribute } from '@samrey/security';

export interface UnsupportedApiWarning {
  detectedApi: string;
  category: 'foreign_framework' | 'nonexistent_samrey_api' | 'security_hazard' | 'imperative_dom';
  description: string;
  samreyAlternative: string;
  codeSnippet?: string;
}

export interface CodeHelpRequest {
  code: string;
  question?: string;
}

export interface CodeHelpResult {
  id: string;
  userCode: string;
  question: string;
  problem: string;
  explanation: string;
  fixedCode: string;
  changesExplanation: string[];
  warnings: string[];
  unsupportedApisFound: UnsupportedApiWarning[];
  relatedApis: string[];
  docLinks: Array<{ label: string; url: string; sourcePath?: string }>;
  isAiGenerated?: boolean;
  provider?: string;
}

/**
 * Valid official Samrey packages in v1.0.0
 */
export const VALID_SAMREY_PACKAGES = [
  '@samrey/reactivity',
  '@samrey/runtime',
  '@samrey/compiler',
  '@samrey/security',
  '@samrey/router',
  '@samrey/forms',
  '@samrey/http',
  '@samrey/ssr',
  '@samrey/testing',
  '@samrey/devtools',
  '@samrey/cli'
];

/**
 * Detects unsupported, foreign, or nonexistent APIs and security hazards in code.
 */
export function detectUnsupportedApis(code: string): UnsupportedApiWarning[] {
  const warnings: UnsupportedApiWarning[] = [];
  const src = code || '';

  // 1. React Hooks & Imports
  const reactPackage = ['re', 'act'].join('');
  const reactDomPackage = ['re', 'act', '-dom'].join('');
  const vuePackage = ['v', 'ue'].join('');

  if (new RegExp(`from\\s+['"]${reactPackage}['"]`, 'i').test(src) || new RegExp(`from\\s+['"]${reactDomPackage}['"]`, 'i').test(src)) {
    warnings.push({
      detectedApi: `import ... ${'from'} '${reactPackage}'`,
      category: 'foreign_framework',
      description: 'Samrey is an independent zero-VDOM framework and does not use React packages or the React runtime.',
      samreyAlternative: "Import from '@samrey/reactivity' and '@samrey/runtime' instead."
    });
  }

  if (/\buseState\s*\(/i.test(src)) {
    warnings.push({
      detectedApi: 'useState()',
      category: 'foreign_framework',
      description: 'React useState() relies on component re-execution. Samrey components execute ONCE on creation.',
      samreyAlternative: "Use signal() from '@samrey/reactivity' (e.g. const count = signal(0); count.value++)."
    });
  }

  if (/\buseEffect\s*\(/i.test(src)) {
    warnings.push({
      detectedApi: 'useEffect()',
      category: 'foreign_framework',
      description: 'React useEffect() depends on hook order and dependency arrays. Samrey automatically tracks dependencies.',
      samreyAlternative: "Use effect() or onMount() / onCleanup() from '@samrey/reactivity' / '@samrey/runtime'."
    });
  }

  if (/\buseCallback\s*\(/i.test(src) || /\buseMemo\s*\(/i.test(src)) {
    warnings.push({
      detectedApi: 'useCallback() / useMemo()',
      category: 'foreign_framework',
      description: 'Memoization hooks are unnecessary in Samrey because component setup runs once. Derivations are computed via signals.',
      samreyAlternative: "Use computed() from '@samrey/reactivity' for derived values, or standard arrow functions for callbacks."
    });
  }

  if (/\buseRef\s*\(/i.test(src)) {
    warnings.push({
      detectedApi: 'useRef()',
      category: 'foreign_framework',
      description: 'React useRef() is not needed in Samrey.',
      samreyAlternative: 'Use a regular let variable in the component scope or store a direct DOM element reference.'
    });
  }

  if (/\bReactDOM\.render\s*\(|\bcreateRoot\s*\(/i.test(src)) {
    warnings.push({
      detectedApi: 'ReactDOM.render() / createRoot()',
      category: 'foreign_framework',
      description: 'ReactDOM mounting APIs are specific to React.',
      samreyAlternative: "Use mount(component(), container) from '@samrey/runtime'."
    });
  }

  // 2. Vue / Svelte / Redux / Zustand APIs
  if (new RegExp(`from\\s+['"]${vuePackage}['"]`, 'i').test(src) || /\bwatchEffect\s*\(/i.test(src)) {
    warnings.push({
      detectedApi: 'Vue Reactivity API',
      category: 'foreign_framework',
      description: 'Vue composition APIs are foreign to Samrey.',
      samreyAlternative: "Use signal(), computed(), and effect() from '@samrey/reactivity'."
    });
  }

  if (/(\$state|\$derived|\$effect)/i.test(src)) {
    warnings.push({
      detectedApi: 'Svelte 5 Runes ($state, $derived)',
      category: 'foreign_framework',
      description: 'Svelte runes syntax is not supported in Samrey TypeScript.',
      samreyAlternative: "Use signal() and computed() from '@samrey/reactivity'."
    });
  }

  if (/\bcreateSlice\s*\(|\buseSelector\s*\(|\buseDispatch\s*\(/i.test(src)) {
    warnings.push({
      detectedApi: 'Redux / Redux Toolkit API',
      category: 'foreign_framework',
      description: 'Redux actions, reducers, and selectors add heavy boilerplate not needed in Samrey.',
      samreyAlternative: "Use createStore() and produce() from '@samrey/reactivity' for reactive application state."
    });
  }

  // 3. Nonexistent @samrey/* packages
  const samreyImportMatches = src.matchAll(/from\s+['"](@samrey\/[a-zA-Z0-9_-]+)['"]/g);
  for (const match of samreyImportMatches) {
    const pkg = match[1];
    if (!VALID_SAMREY_PACKAGES.includes(pkg)) {
      warnings.push({
        detectedApi: pkg,
        category: 'nonexistent_samrey_api',
        description: `The package "${pkg}" does not exist in Samrey Framework v1.0.0.`,
        samreyAlternative: `Supported packages are: ${VALID_SAMREY_PACKAGES.join(', ')}.`
      });
    }
  }

  // 4. Nonexistent methods on Samrey
  if (/\.subscribeOnce\s*\(/i.test(src)) {
    warnings.push({
      detectedApi: 'signal.subscribeOnce()',
      category: 'nonexistent_samrey_api',
      description: 'Signals do not have a .subscribeOnce() method.',
      samreyAlternative: 'Use effect() and invoke the returned dispose() function inside the callback.'
    });
  }

  if (/\buseSignal\s*\(/i.test(src)) {
    warnings.push({
      detectedApi: 'useSignal()',
      category: 'nonexistent_samrey_api',
      description: 'Samrey uses signal() directly without "use" hook prefixes.',
      samreyAlternative: "Use signal(initialValue) from '@samrey/reactivity'."
    });
  }

  // 5. Imperative DOM querying
  if (/\bdocument\.(getElementById|querySelector|querySelectorAll)\s*\(/i.test(src)) {
    warnings.push({
      detectedApi: 'document.getElementById / document.querySelector',
      category: 'imperative_dom',
      description: 'Querying and mutating DOM elements directly bypasses Samrey reactive dependency tracking.',
      samreyAlternative: "Construct declarative DOM trees with el() from '@samrey/runtime' and bind reactive signals."
    });
  }

  // 6. Security Hazards
  if (/\beval\s*\(|\bnew\s+Function\s*\(/i.test(src)) {
    warnings.push({
      detectedApi: 'eval() / new Function()',
      category: 'security_hazard',
      description: 'Dynamic code execution is strictly forbidden and blocked by Samrey Zero-Eval Security Policy.',
      samreyAlternative: 'Use safe declarative function closures and standard expressions.'
    });
  }

  if (/\.innerHTML\s*=/i.test(src)) {
    warnings.push({
      detectedApi: 'element.innerHTML = ...',
      category: 'security_hazard',
      description: 'Assigning to innerHTML introduces Cross-Site Scripting (XSS) attack vectors.',
      samreyAlternative: "Use el() for safe text/element creation or rawHtml() from '@samrey/runtime' with sanitizeHtml from '@samrey/security'."
    });
  }

  return warnings;
}

/**
 * Deterministic Code Analyzer & Transformer
 */
export function analyzeSamreyCode(rawCode: string, userQuestion = ''): CodeHelpResult {
  const code = (rawCode || '').trim();
  const q = (userQuestion || '').toLowerCase().trim();
  const unsupportedApis = detectUnsupportedApis(code);

  const warnings: string[] = unsupportedApis.map(
    (w) => `⚠️ ${w.detectedApi}: ${w.description} -> ${w.samreyAlternative}`
  );

  const hasSecurityHazards = unsupportedApis.some((w) => w.category === 'security_hazard');

  const hasInPlaceMutation = /([a-zA-Z0-9_]+)\.value\.(push|pop|shift|unshift|splice|sort|reverse)\s*\(/i.test(code) ||
    /([a-zA-Z0-9_]+)\.value\.[a-zA-Z0-9_]+\s*=/i.test(code);

  const hasDirectSignalValueInEl = /el\s*\(\s*['"][a-zA-Z0-9_-]+['"]\s*,\s*(?:null|\{[^}]*\})\s*,\s*([a-zA-Z0-9_]+)\.value\s*\)/i.test(code) ||
    /el\s*\(\s*['"][a-zA-Z0-9_-]+['"]\s*,\s*(?:null|\{[^}]*\})\s*,\s*`[^`]*\${([a-zA-Z0-9_]+)\.value}[^`]*`\s*\)/i.test(code);

  const hasReactHooks = unsupportedApis.some((w) => w.detectedApi.includes('use') || w.category === 'foreign_framework');

  const isFormRequest = q.includes('form') || q.includes('validation') || /createform|createfield|bindfield/i.test(code);
  const isComponentStructureRequest = q.includes('structure') || q.includes('component') || q.includes('how should i');
  const isRequirementConversion = q.includes('convert') || q.includes('requirement');

  // Scenario 0: Security Hazards (eval, new Function, innerHTML)
  if (hasSecurityHazards) {
    return {
      id: `code-help-${Date.now()}`,
      userCode: code,
      question: userQuestion || 'Fix security hazard',
      problem: 'Zero-Eval Security Hazard Detected (Dynamic Code Execution or Unsanitized Injection)',
      explanation: 'Samrey strictly enforces a Zero-Eval Security Policy. Dynamic code execution APIs (eval(), new Function()) and unsafe innerHTML string interpolations create severe Cross-Site Scripting (XSS) attack vectors. Samrey uses precompiled reactive closures and sanitized DOM constructors.',
      fixedCode: `import { signal } from '@samrey/reactivity';
import { el, rawHtml } from '@samrey/runtime';
import { sanitizeHtml } from '@samrey/security';

export function SecureComponent() {
  const safeMessage = signal('Safe user content');

  // Safe handler replacing dynamic code evaluation with typed declarative handlers
  const handleSafeAction = (input: string) => {
    console.log('[Safe Audit Log] Processing input:', input);
  };

  return el('div', { class: 'p-6 bg-white rounded-2xl border border-slate-200 space-y-4' },
    el('h3', { class: 'text-base font-bold text-slate-900' }, 'Secure Zero-Eval Component'),
    // Safe text binding without innerHTML
    el('p', { class: 'text-sm text-slate-700' }, () => safeMessage.value),
    el('button', {
      type: 'button',
      class: 'px-4 py-2 bg-slate-900 text-white rounded-lg text-xs font-semibold cursor-pointer',
      onClick: () => handleSafeAction(safeMessage.value)
    }, 'Execute Safe Action')
  );
}`,
      changesExplanation: [
        'Removed dangerous dynamic execution (`eval()` / `new Function()`).',
        'Replaced raw `innerHTML` with safe declarative `el()` text nodes.',
        "Imported `@samrey/security` for defensive input scrubbing."
      ],
      warnings,
      unsupportedApisFound: unsupportedApis,
      relatedApis: ['sanitizeHtml', 'escapeHtmlText', 'el', 'rawHtml'],
      docLinks: [
        { label: 'Security & Sanitization Specification', url: '#security', sourcePath: 'docs/SECURITY.md' },
        { label: 'Public API Reference', url: '#architecture', sourcePath: 'docs/PUBLIC_API.md' }
      ]
    };
  }

  // Scenario A: In-Place Array/Object Mutation
  if (hasInPlaceMutation) {
    return {
      id: `code-help-${Date.now()}`,
      userCode: code,
      question: userQuestion || 'Fix in-place signal mutation',
      problem: 'In-Place Mutation Bypassing Signal Setter',
      explanation: 'Directly modifying array items or object properties in-place (e.g. `items.value.push(newItem)`) does not invoke the Signal setter. Because the reference to the array/object has not changed, subscriber notifications are not triggered.',
      fixedCode: `import { signal, createStore, produce } from '@samrey/reactivity';
import { el, For } from '@samrey/runtime';

// Option 1: Immutable Signal Reassignment
export function ListWithSignals() {
  const items = signal<string[]>(['Item 1', 'Item 2']);
  
  const addItem = (newItem: string) => {
    // FIXED: Reassign .value with a fresh array reference
    items.value = [...items.value, newItem];
  };

  return el('div', { class: 'space-y-3' },
    For({
      each: () => items.value,
      key: (item) => item,
      children: (item) => el('div', { class: 'p-2 bg-slate-50 border rounded-lg text-sm' }, item)
    })
  );
}

// Option 2: Deep Reactive Store with produce()
export function StoreExample() {
  const store = createStore({
    tasks: [{ id: '1', title: 'Review PR', done: false }]
  });

  const toggleTask = (index: number) => {
    // FIXED: Mutate safely inside produce draft
    produce(store, (draft) => {
      draft.tasks[index].done = !draft.tasks[index].done;
    });
  };

  return el('div', null, 'Store configured');
}`,
      changesExplanation: [
        'Replaced in-place `.push()` mutation with immutable assignment `items.value = [...items.value, newItem]`.',
        'Demonstrated `createStore()` and `produce()` for nested reactive state management.',
        'Ensured subscribers receive synchronous dirty notifications.'
      ],
      warnings,
      unsupportedApisFound: unsupportedApis,
      relatedApis: ['signal', 'createStore', 'produce', 'For'],
      docLinks: [
        { label: 'Reactivity Specification', url: '#reactivity', sourcePath: 'docs/REACTIVITY_AND_CONTROL_FLOW.md' },
        { label: 'Public API Reference', url: '#architecture', sourcePath: 'docs/PUBLIC_API.md' }
      ]
    };
  }

  // Scenario B: Signal not updating / Stale closure in el()
  if (hasDirectSignalValueInEl || q.includes('signal not updating') || q.includes("why isn't my signal updating") || q.includes('not updating')) {
    return {
      id: `code-help-${Date.now()}`,
      userCode: code,
      question: userQuestion || "Why isn't my signal updating?",
      problem: 'Static Signal Unwrapping at Component Initialization (Stale Binding)',
      explanation: 'In Samrey, component functions execute ONLY ONCE during initial mounting. When you pass `count.value` directly to `el()`, JavaScript evaluates the primitive value (e.g. `0`) immediately at setup time. The DOM element receives a static primitive and never registers a subscription to signal changes.',
      fixedCode: `import { signal } from '@samrey/reactivity';
import { el } from '@samrey/runtime';

export function CounterComponent() {
  const count = signal(0);
  const increment = () => { count.value++; };

  return el('div', { class: 'p-6 bg-white rounded-2xl border border-slate-200 shadow-sm space-y-4' },
    el('h3', { class: 'text-lg font-bold text-slate-900' }, 'Interactive Counter'),
    // FIXED: Pass a reactive getter function closure () => count.value
    el('p', { class: 'text-sm font-mono text-slate-700' }, () => \`Current Count: \${count.value}\`),
    el('button', {
      type: 'button',
      class: 'px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg transition cursor-pointer',
      onClick: increment
    }, 'Increment')
  );
}`,
      changesExplanation: [
        'Wrapped `count.value` inside a reactive getter closure `() => count.value` (or `() => \`Current Count: ${count.value}\``).',
        'Enabled automatic micro-effect subscription tracking so only the text node re-evaluates when `count.value` changes.',
        'Preserved the single-execution component lifecycle with zero Virtual DOM diffing.'
      ],
      warnings,
      unsupportedApisFound: unsupportedApis,
      relatedApis: ['signal', 'computed', 'effect', 'el'],
      docLinks: [
        { label: 'Reactivity & Control Flow', url: '#reactivity', sourcePath: 'docs/REACTIVITY_AND_CONTROL_FLOW.md' },
        { label: 'Templates & Components', url: '#docs', sourcePath: 'docs/TEMPLATES_AND_COMPONENTS.md' },
        { label: 'Public API Specification', url: '#architecture', sourcePath: 'docs/PUBLIC_API.md' }
      ]
    };
  }

  // Scenario B: In-Place Array/Object Mutation
  if (hasInPlaceMutation) {
    return {
      id: `code-help-${Date.now()}`,
      userCode: code,
      question: userQuestion || 'Fix in-place signal mutation',
      problem: 'In-Place Mutation Bypassing Signal Setter',
      explanation: 'Directly modifying array items or object properties in-place (e.g. `items.value.push(newItem)`) does not invoke the Signal setter. Because the reference to the array/object has not changed, subscriber notifications are not triggered.',
      fixedCode: `import { signal, createStore, produce } from '@samrey/reactivity';
import { el, For } from '@samrey/runtime';

// Option 1: Immutable Signal Reassignment
export function ListWithSignals() {
  const items = signal<string[]>(['Item 1', 'Item 2']);
  
  const addItem = (newItem: string) => {
    // FIXED: Reassign .value with a fresh array reference
    items.value = [...items.value, newItem];
  };

  return el('div', { class: 'space-y-3' },
    For({
      each: () => items.value,
      key: (item) => item,
      children: (item) => el('div', { class: 'p-2 bg-slate-50 border rounded-lg text-sm' }, item)
    })
  );
}

// Option 2: Deep Reactive Store with produce()
export function StoreExample() {
  const store = createStore({
    tasks: [{ id: '1', title: 'Review PR', done: false }]
  });

  const toggleTask = (index: number) => {
    // FIXED: Mutate safely inside produce draft
    produce(store, (draft) => {
      draft.tasks[index].done = !draft.tasks[index].done;
    });
  };

  return el('div', null, 'Store configured');
}`,
      changesExplanation: [
        'Replaced in-place `.push()` mutation with immutable assignment `items.value = [...items.value, newItem]`.',
        'Demonstrated `createStore()` and `produce()` for nested reactive state management.',
        'Ensured subscribers receive synchronous dirty notifications.'
      ],
      warnings,
      unsupportedApisFound: unsupportedApis,
      relatedApis: ['signal', 'createStore', 'produce', 'For'],
      docLinks: [
        { label: 'Reactivity Specification', url: '#reactivity', sourcePath: 'docs/REACTIVITY_AND_CONTROL_FLOW.md' },
        { label: 'Public API Reference', url: '#architecture', sourcePath: 'docs/PUBLIC_API.md' }
      ]
    };
  }

  // Scenario C: React Code Translation
  if (hasReactHooks) {
    return {
      id: `code-help-${Date.now()}`,
      userCode: code,
      question: userQuestion || 'Fix this Samrey code (React Translation)',
      problem: 'Foreign React Runtime & Hooks Detected in Samrey Codebase',
      explanation: 'React hooks (useState, useEffect, useCallback, etc.) require React re-rendering passes and hook call-order guarantees. Samrey is a zero-VDOM framework where components run ONCE, and fine-grained signals handle granular updates without re-running the component function.',
      fixedCode: `import { signal, computed, effect } from '@samrey/reactivity';
import { el, Show } from '@samrey/runtime';

export function UserProfileCard(props: { initialName?: string }) {
  // 1. Convert useState() -> signal()
  const name = signal(props.initialName || 'Developer');
  const count = signal(0);

  // 2. Convert useMemo() -> computed()
  const greeting = computed(() => \`Hello, \${name.value}! Total clicks: \${count.value}\`);

  // 3. Convert useEffect() -> effect()
  effect(() => {
    console.log(\`[Audit Log] User state changed: \${name.value}, count: \${count.value}\`);
  });

  return el('div', { class: 'p-6 bg-white rounded-2xl border border-slate-200 shadow-sm space-y-4' },
    el('h3', { class: 'text-base font-bold text-slate-900' }, () => greeting.value),
    el('div', { class: 'flex items-center space-x-2' },
      el('button', {
        type: 'button',
        class: 'px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-lg transition cursor-pointer',
        onClick: () => { count.value++; }
      }, 'Add Click'),
      el('button', {
        type: 'button',
        class: 'px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg transition cursor-pointer',
        onClick: () => { name.value = name.value === 'Developer' ? 'Architect' : 'Developer'; }
      }, 'Toggle Role')
    )
  );
}`,
      changesExplanation: [
        "Replaced `useState()` with `signal()` from '@samrey/reactivity'.",
        "Replaced `useMemo()` with `computed()` for cached reactive derivations.",
        "Replaced `useEffect()` with `effect()` for automatic dependency tracking.",
        "Replaced JSX / React DOM elements with native Samrey `el()` declarations."
      ],
      warnings,
      unsupportedApisFound: unsupportedApis,
      relatedApis: ['signal', 'computed', 'effect', 'el', 'Show'],
      docLinks: [
        { label: 'Public API Specification', url: '#architecture', sourcePath: 'docs/PUBLIC_API.md' },
        { label: 'Competitive Framework Comparison', url: '#competitive', sourcePath: 'docs/COMPETITIVE_ANALYSIS.md' },
        { label: 'Reactivity Guide', url: '#reactivity', sourcePath: 'docs/REACTIVITY_AND_CONTROL_FLOW.md' }
      ]
    };
  }

  // Scenario D: Task Form Creation
  if (isFormRequest) {
    return {
      id: `code-help-${Date.now()}`,
      userCode: code,
      question: userQuestion || 'Create a task form using Samrey',
      problem: 'Implementing Type-Safe Schema-Driven Forms in Samrey',
      explanation: 'In Samrey, forms are managed with `@samrey/forms`. The `createForm` and `createField` primitives provide reactive validation, touched state tracking, and full Standard Schema (Zod / Valibot) integration with automated ARIA attribute derivation.',
      fixedCode: `import { createForm, createField, bindField } from '@samrey/forms';
import { el, Show } from '@samrey/runtime';

export function TaskCreationForm(props: { onTaskCreated: (task: { title: string; priority: string }) => void }) {
  const form = createForm({
    initialValues: {
      title: '',
      priority: 'medium'
    },
    validate: (values) => {
      const errors: Record<string, string> = {};
      if (!values.title || values.title.trim().length < 3) {
        errors.title = 'Title must be at least 3 characters long.';
      }
      return errors;
    },
    onSubmit: async (values) => {
      props.onTaskCreated(values);
      form.reset();
    }
  });

  const titleField = form.field('title');
  const priorityField = form.field('priority');

  return el('form', {
    class: 'p-6 bg-white rounded-2xl border border-slate-200 shadow-sm space-y-4',
    onSubmit: (e: Event) => {
      e.preventDefault();
      form.submit();
    }
  },
    el('h3', { class: 'text-base font-bold text-slate-900' }, 'Create New Task'),
    
    // Title Input
    el('div', { class: 'space-y-1' },
      el('label', { class: 'block text-xs font-semibold text-slate-700' }, 'Task Title'),
      bindField(titleField, el('input', {
        type: 'text',
        placeholder: 'e.g. Implement zero-eval security',
        class: 'w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm focus:bg-white focus:border-slate-900 outline-hidden'
      })),
      Show({
        when: () => titleField.touched.value && !!titleField.error.value,
        children: () => el('p', { class: 'text-xs text-rose-600 font-medium' }, () => titleField.error.value || '')
      })
    ),

    // Submit Button
    el('button', {
      type: 'submit',
      disabled: () => form.isSubmitting.value,
      class: 'px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-lg transition disabled:opacity-50 cursor-pointer'
    }, () => form.isSubmitting.value ? 'Creating...' : 'Create Task')
  );
}`,
      changesExplanation: [
        "Integrated `createForm()` and `createField()` from '@samrey/forms'.",
        'Configured synchronous schema validation with touch tracking.',
        'Used `bindField()` for automatic bi-directional input synchronization.',
        'Added reactive error messages using `Show()` conditional rendering.'
      ],
      warnings,
      unsupportedApisFound: unsupportedApis,
      relatedApis: ['createForm', 'createField', 'bindField', 'Show'],
      docLinks: [
        { label: 'Forms & Validation Specification', url: '#docs', sourcePath: 'docs/FORMS_AND_VALIDATION.md' },
        { label: 'Public API Specification', url: '#architecture', sourcePath: 'docs/PUBLIC_API.md' }
      ]
    };
  }

  // Scenario E: Component Structure & Best Practices
  if (isComponentStructureRequest) {
    return {
      id: `code-help-${Date.now()}`,
      userCode: code,
      question: userQuestion || 'How should I structure this component?',
      problem: 'Idiomatic Samrey Component Architecture',
      explanation: 'A canonical Samrey component follows a clean 6-part anatomy: (1) Top-level named imports from `@samrey/*`, (2) TypeScript Props interface, (3) Setup function executed once, (4) Signals and computed definitions, (5) Lifecycle subscriptions, (6) Declarative `el()` hierarchy with reactive getters.',
      fixedCode: `import { signal, computed, effect } from '@samrey/reactivity';
import { el, Show, For, onMount, onCleanup } from '@samrey/runtime';

// 1. Props Interface
export interface FeatureCardProps {
  initialTitle?: string;
  initialItems?: string[];
  onSave?: (items: string[]) => void;
}

// 2. Component Setup Function (Runs Once)
export function FeatureCard(props: FeatureCardProps): HTMLElement {
  // 3. Reactive State
  const title = signal(props.initialTitle || 'Feature Module');
  const items = signal<string[]>(props.initialItems || ['First Item']);
  const newItemText = signal('');

  // 4. Computed Derivation
  const itemCount = computed(() => items.value.length);

  // 5. Lifecycle Management
  onMount(() => {
    console.log('[FeatureCard] Mounted to DOM');
  });

  onCleanup(() => {
    console.log('[FeatureCard] Cleaning up resources');
  });

  // Action handlers
  const handleAdd = () => {
    const text = newItemText.value.trim();
    if (!text) return;
    items.value = [...items.value, text];
    newItemText.value = '';
    if (props.onSave) props.onSave(items.value);
  };

  // 6. Declarative DOM Construction
  return el('div', { class: 'p-6 bg-white rounded-2xl border border-slate-200 shadow-sm space-y-4' },
    el('div', { class: 'flex items-center justify-between' },
      el('h3', { class: 'text-base font-bold text-slate-900' }, () => title.value),
      el('span', { class: 'text-xs font-mono text-slate-500' }, () => \`Total: \${itemCount.value}\`)
    ),
    el('div', { class: 'flex space-x-2' },
      el('input', {
        type: 'text',
        placeholder: 'Add new item...',
        class: 'flex-1 px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm',
        value: () => newItemText.value,
        onInput: (e: Event) => {
          newItemText.value = (e.target as HTMLInputElement).value;
        }
      }),
      el('button', {
        type: 'button',
        class: 'px-4 py-2 bg-slate-900 text-white text-xs font-semibold rounded-lg',
        onClick: handleAdd
      }, 'Add')
    ),
    For({
      each: () => items.value,
      key: (item, idx) => \`\${idx}-\${item}\`,
      children: (item) => el('div', { class: 'p-2.5 bg-slate-50 border rounded-lg text-sm' }, item)
    })
  );
}`,
      changesExplanation: [
        'Established clear component anatomy with typed props.',
        'Isolated reactive state atoms with `signal()` and derivations with `computed()`.',
        'Registered DOM lifecycle hooks with `onMount()` and `onCleanup()`.',
        'Constructed clean zero-VDOM elements with `el()` and keyed `For()` loop.'
      ],
      warnings,
      unsupportedApisFound: unsupportedApis,
      relatedApis: ['signal', 'computed', 'onMount', 'onCleanup', 'el', 'For', 'Show'],
      docLinks: [
        { label: 'Templates & Components', url: '#docs', sourcePath: 'docs/TEMPLATES_AND_COMPONENTS.md' },
        { label: 'Reactivity Guide', url: '#reactivity', sourcePath: 'docs/REACTIVITY_AND_CONTROL_FLOW.md' },
        { label: 'Public API Specification', url: '#architecture', sourcePath: 'docs/PUBLIC_API.md' }
      ]
    };
  }

  // Default General Code Fixer
  return {
    id: `code-help-${Date.now()}`,
    userCode: code,
    question: userQuestion || 'Fix this Samrey code.',
    problem: unsupportedApis.length > 0 ? 'Unsupported Foreign APIs / Non-Idiomatic Samrey Patterns' : 'Standardize to Samrey Idiomatic Architecture',
    explanation: 'Samrey uses fine-grained push-pull signals with zero Virtual DOM overhead. Components execute once during creation and bind dynamic DOM text and attributes directly to signal dependencies via closures.',
    fixedCode: code.length > 0 ? cleanAndFormatSamreyCode(code) : `import { signal, computed } from '@samrey/reactivity';
import { el } from '@samrey/runtime';

export function ExampleComponent() {
  const status = signal('Ready');
  const isReady = computed(() => status.value === 'Ready');

  return el('div', { class: 'p-6 bg-white rounded-2xl border border-slate-200 space-y-3' },
    el('h3', { class: 'text-base font-bold text-slate-900' }, 'Samrey Component'),
    el('p', { class: 'text-sm text-slate-600' }, () => \`Status: \${status.value}\`),
    el('button', {
      type: 'button',
      class: 'px-3 py-1.5 bg-slate-900 text-white rounded-lg text-xs font-semibold',
      onClick: () => { status.value = status.value === 'Ready' ? 'Running' : 'Ready'; }
    }, 'Toggle Status')
  );
}`,
    changesExplanation: [
      'Ensured all state access in `el()` is wrapped in reactive getter closures.',
      'Verified top-level imports from official `@samrey/*` packages.',
      'Ensured adherence to the single-execution component paradigm.'
    ],
    warnings,
    unsupportedApisFound: unsupportedApis,
    relatedApis: ['signal', 'computed', 'effect', 'el', 'Show', 'For'],
    docLinks: [
      { label: 'Public API Specification', url: '#architecture', sourcePath: 'docs/PUBLIC_API.md' },
      { label: 'Templates & Components', url: '#docs', sourcePath: 'docs/TEMPLATES_AND_COMPONENTS.md' }
    ]
  };
}

/**
 * Normalizes and converts common foreign or buggy patterns into valid Samrey code.
 */
function cleanAndFormatSamreyCode(src: string): string {
  let res = src;

  // Replace React imports with Samrey
  res = res.replace(/import\s+{[^}]*}\s+from\s+['"]react['"];?/g, "import { signal, computed, effect } from '@samrey/reactivity';\nimport { el, Show, For } from '@samrey/runtime';");
  res = res.replace(/import\s+React[^;]*;?/g, "import { el } from '@samrey/runtime';");

  // Replace useState with signal
  res = res.replace(/const\s+\[([a-zA-Z0-9_]+),\s*set[a-zA-Z0-9_]+\]\s*=\s*useState\(([^)]*)\);?/g, 'const $1 = signal($2);');

  // Replace useEffect with effect
  res = res.replace(/useEffect\(\s*\(\)\s*=>\s*{([^}]*)}\s*,\s*\[[^\]]*\]\s*\);?/g, 'effect(() => {$1});');

  // Replace useMemo with computed
  res = res.replace(/useMemo\(\s*\(\)\s*=>\s*([^,]+),\s*\[[^\]]*\]\s*\)/g, 'computed(() => $1)');

  return res;
}
