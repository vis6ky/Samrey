/**
 * @license Apache-2.0
 * @samrey/doc - In-Browser Live Runtime Sandbox & Safe Execution Engine
 *
 * Executes valid Samrey code snippets directly in the browser using official
 * @samrey/* primitives, with reactive lifecycle management, AST normalization,
 * and zero Virtual DOM overhead.
 */

import * as Reactivity from '@samrey/reactivity';
import * as Runtime from '@samrey/runtime';
import * as Forms from '@samrey/forms';
import * as Security from '@samrey/security';
import * as Http from '@samrey/http';
import { icon } from './icons.js';

import { evaluateSandboxedProgram } from './sandboxInterpreter.js';

export interface SandboxLog {
  time: string;
  text: string;
  type: 'info' | 'success' | 'warn' | 'error';
}

export interface ExecutionResult {
  success: boolean;
  error?: string;
  node?: Node;
}

export interface PlaygroundPreset {
  id: string;
  title: string;
  description: string;
  category: string;
  code: string;
}

export const PLAYGROUND_PRESETS: PlaygroundPreset[] = [
  {
    id: 'counter-computed',
    title: 'Reactive Counter & Computed Double',
    category: 'Reactivity',
    description: 'Fine-grained signals with derived computed values and dynamic DOM text bindings.',
    code: `import { signal, computed } from '@samrey/reactivity';
import { el } from '@samrey/runtime';

export function CounterWidget() {
  const count = signal(0);
  const step = signal(1);
  const double = computed(() => count.value * 2);
  const isNegative = computed(() => count.value < 0);

  return el('div', { class: 'p-6 bg-white rounded-2xl border border-slate-200 shadow-sm space-y-4 max-w-md mx-auto' },
    el('div', { class: 'flex items-center justify-between pb-3 border-b border-slate-100' },
      el('h3', { class: 'font-bold text-slate-900 text-base' }, '⚡ Live Reactive Counter'),
      el('span', { class: 'px-2 py-0.5 rounded-full text-xs font-mono bg-indigo-50 text-indigo-700 font-semibold border border-indigo-200' },
        'Fine-Grained Signal'
      )
    ),
    el('div', { grid: true, class: 'grid grid-cols-2 gap-3' },
      el('div', { class: 'p-4 bg-slate-50 rounded-xl border border-slate-200/80 text-center' },
        el('div', { class: 'text-xs text-slate-500 font-medium' }, 'Current Count'),
        el('div', {
          class: () => \`text-3xl font-mono font-bold \${isNegative.value ? 'text-rose-600' : 'text-indigo-600'}\`
        }, () => count.value)
      ),
      el('div', { class: 'p-4 bg-slate-50 rounded-xl border border-slate-200/80 text-center' },
        el('div', { class: 'text-xs text-slate-500 font-medium' }, 'Computed (2×)'),
        el('div', { class: 'text-3xl font-mono font-bold text-purple-600' },
          () => double.value
        )
      )
    ),
    el('div', { class: 'flex items-center space-x-2' },
      el('label', { class: 'text-xs font-semibold text-slate-600' }, 'Step Size:'),
      el('select', {
        class: 'p-1.5 bg-slate-50 rounded-lg border border-slate-300 text-xs font-mono',
        onChange: (e) => {
          step.value = Number(e.target.value);
        }
      },
        el('option', { value: '1' }, '±1'),
        el('option', { value: '5' }, '±5'),
        el('option', { value: '10' }, '±10')
      )
    ),
    el('div', { class: 'flex flex-wrap gap-2 pt-2' },
      el('button', {
        type: 'button',
        class: 'flex-1 py-2 px-3 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs rounded-xl shadow-xs transition cursor-pointer',
        onClick: () => { count.value += step.value; }
      }, '＋ Increment'),
      el('button', {
        type: 'button',
        class: 'flex-1 py-2 px-3 bg-slate-700 hover:bg-slate-600 text-white font-semibold text-xs rounded-xl shadow-xs transition cursor-pointer',
        onClick: () => { count.value -= step.value; }
      }, '－ Decrement'),
      el('button', {
        type: 'button',
        class: 'py-2 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-xl transition cursor-pointer border border-slate-200',
        onClick: () => { count.value = 0; }
      }, 'Reset')
    )
  );
}`
  },
  {
    id: 'dynamic-list-for',
    title: 'Reactive List & Filter (<Show> / <For>)',
    category: 'Control Flow',
    description: 'Fine-grained key-indexed list rendering with dynamic conditional fallbacks and zero virtual DOM.',
    code: `import { signal, computed } from '@samrey/reactivity';
import { el, Show, For } from '@samrey/runtime';

export function TaskListWidget() {
  const tasks = signal([
    { id: 1, text: 'Learn Samrey single-execution components', done: true },
    { id: 2, text: 'Try fine-grained reactive signals', done: true },
    { id: 3, text: 'Build production app with Zero VDOM', done: false }
  ]);
  const newText = signal('');
  const filter = signal('all');

  const filteredTasks = computed(() => {
    const f = filter.value;
    return tasks.value.filter(t => {
      if (f === 'active') return !t.done;
      if (f === 'completed') return t.done;
      return true;
    });
  });

  const addTask = () => {
    const val = newText.value.trim();
    if (!val) return;
    tasks.value = [
      ...tasks.value,
      { id: Date.now(), text: val, done: false }
    ];
    newText.value = '';
  };

  const toggleTask = (id) => {
    tasks.value = tasks.value.map(t => t.id === id ? { ...t, done: !t.done } : t);
  };

  const removeTask = (id) => {
    tasks.value = tasks.value.filter(t => t.id !== id);
  };

  return el('div', { class: 'p-6 bg-white rounded-2xl border border-slate-200 shadow-sm space-y-4 max-w-lg mx-auto' },
    el('div', { class: 'flex items-center justify-between pb-3 border-b border-slate-100' },
      el('h3', { class: 'font-bold text-slate-900 text-base' }, '📝 Reactive Task Studio'),
      el('span', { class: 'text-xs text-slate-500 font-mono' },
        () => \`\${tasks.value.filter(t => t.done).length}/\${tasks.value.length} completed\`
      )
    ),
    // Input Row
    el('div', { class: 'flex space-x-2' },
      el('input', {
        type: 'text',
        placeholder: 'Add new task...',
        class: 'flex-1 px-3 py-2 bg-slate-50 rounded-xl border border-slate-200 text-xs focus:ring-1 focus:ring-indigo-500 outline-hidden',
        value: () => newText.value,
        onInput: (e) => { newText.value = e.target.value; },
        onKeyDown: (e) => { if (e.key === 'Enter') addTask(); }
      }),
      el('button', {
        type: 'button',
        class: 'px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold shadow-xs transition cursor-pointer',
        onClick: addTask
      }, 'Add')
    ),
    // Filter Tabs
    el('div', { class: 'flex space-x-1.5 text-xs font-medium' },
      el('button', {
        type: 'button',
        class: () => \`px-2.5 py-1 rounded-lg transition \${filter.value === 'all' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}\`,
        onClick: () => { filter.value = 'all'; }
      }, 'All'),
      el('button', {
        type: 'button',
        class: () => \`px-2.5 py-1 rounded-lg transition \${filter.value === 'active' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}\`,
        onClick: () => { filter.value = 'active'; }
      }, 'Active'),
      el('button', {
        type: 'button',
        class: () => \`px-2.5 py-1 rounded-lg transition \${filter.value === 'completed' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}\`,
        onClick: () => { filter.value = 'completed'; }
      }, 'Completed')
    ),
    // List & Empty Fallback
    Show({
      when: () => filteredTasks.value.length > 0,
      fallback: () => el('div', { class: 'py-8 text-center text-xs text-slate-400 font-mono bg-slate-50 rounded-xl border border-dashed border-slate-200' },
        'No tasks matching current filter.'
      ),
      children: () => el('ul', { class: 'space-y-2' },
        For({
          each: () => filteredTasks.value,
          key: (t) => t.id,
          children: (task) => el('li', {
            class: 'p-3 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-between transition hover:border-slate-300'
          },
            el('label', { class: 'flex items-center space-x-2.5 cursor-pointer flex-1' },
              el('input', {
                type: 'checkbox',
                class: 'rounded text-indigo-600 focus:ring-0',
                checked: task.done,
                onChange: () => toggleTask(task.id)
              }),
              el('span', {
                class: task.done ? 'line-through text-slate-400 text-xs' : 'text-slate-800 text-xs font-medium'
              }, task.text)
            ),
            el('button', {
              type: 'button',
              class: 'text-slate-400 hover:text-rose-600 transition text-xs p-1 cursor-pointer',
              onClick: () => removeTask(task.id)
            }, '✕')
          )
        })
      )
    })
  );
}`
  },
  {
    id: 'form-validation',
    title: 'Reactive Form Validation (@samrey/forms)',
    category: 'Forms',
    description: 'Declarative field validation, dirty tracking, and instant error status with zero component re-renders.',
    code: `import { signal } from '@samrey/reactivity';
import { el, Show } from '@samrey/runtime';
import { createForm } from '@samrey/forms';

export function SignupFormWidget() {
  const isSubmitted = signal(false);

  const form = createForm({
    initialValues: {
      username: '',
      email: ''
    },
    validators: {
      username: (val) => !val ? 'Username is required' : val.length < 3 ? 'Min 3 chars' : null,
      email: (val) => !val ? 'Email is required' : !val.includes('@') ? 'Must contain @' : null
    },
    onSubmit: async (values) => {
      isSubmitted.value = true;
    }
  });

  return el('div', { class: 'p-6 bg-white rounded-2xl border border-slate-200 shadow-sm space-y-4 max-w-md mx-auto' },
    el('div', { class: 'pb-3 border-b border-slate-100' },
      el('h3', { class: 'font-bold text-slate-900 text-base' }, '🛡️ Form Validation'),
      el('p', { class: 'text-xs text-slate-500' }, 'Live validation with @samrey/forms')
    ),
    Show({
      when: () => isSubmitted.value,
      children: () => el('div', { class: 'p-4 bg-emerald-50 border border-emerald-200 rounded-xl space-y-2 text-xs text-emerald-900' },
        el('div', { class: 'font-bold text-emerald-800' }, '✓ Form Submitted Successfully!'),
        el('pre', { class: 'p-2 bg-white rounded font-mono text-[11px]' },
          () => JSON.stringify({
            username: form.fields.username.value.value,
            email: form.fields.email.value.value
          }, null, 2)
        ),
        el('button', {
          type: 'button',
          class: 'px-3 py-1.5 bg-emerald-600 text-white rounded-lg font-semibold hover:bg-emerald-700 cursor-pointer',
          onClick: () => { isSubmitted.value = false; form.reset(); }
        }, 'Reset Form')
      ),
      fallback: () => el('form', {
        class: 'space-y-3',
        onSubmit: (e) => {
          e.preventDefault();
          form.handleSubmit();
        }
      },
        // Username Field
        el('div', { class: 'space-y-1' },
          el('label', { class: 'text-xs font-semibold text-slate-700' }, 'Username'),
          el('input', {
            type: 'text',
            placeholder: 'alex_dev',
            class: () => \`w-full px-3 py-2 rounded-xl border text-xs outline-hidden transition \${
              form.fields.username.error.value && form.fields.username.touched.value
                ? 'bg-rose-50/50 border-rose-300 focus:border-rose-500'
                : 'bg-slate-50 border-slate-200 focus:border-indigo-500'
            }\`,
            value: () => form.fields.username.value.value,
            onInput: (e) => {
              form.fields.username.setValue(e.target.value);
            },
            onBlur: () => { form.fields.username.setTouched(true); }
          }),
          Show({
            when: () => Boolean(form.fields.username.error.value && form.fields.username.touched.value),
            children: () => el('p', { class: 'text-[11px] font-semibold text-rose-600' },
              () => form.fields.username.error.value || ''
            )
          })
        ),
        // Email Field
        el('div', { class: 'space-y-1' },
          el('label', { class: 'text-xs font-semibold text-slate-700' }, 'Work Email'),
          el('input', {
            type: 'email',
            placeholder: 'alex@company.com',
            class: () => \`w-full px-3 py-2 rounded-xl border text-xs outline-hidden transition \${
              form.fields.email.error.value && form.fields.email.touched.value
                ? 'bg-rose-50/50 border-rose-300 focus:border-rose-500'
                : 'bg-slate-50 border-slate-200 focus:border-indigo-500'
            }\`,
            value: () => form.fields.email.value.value,
            onInput: (e) => {
              form.fields.email.setValue(e.target.value);
            },
            onBlur: () => { form.fields.email.setTouched(true); }
          }),
          Show({
            when: () => Boolean(form.fields.email.error.value && form.fields.email.touched.value),
            children: () => el('p', { class: 'text-[11px] font-semibold text-rose-600' },
              () => form.fields.email.error.value || ''
            )
          })
        ),
        // Submit Button
        el('button', {
          type: 'submit',
          class: 'w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-semibold text-xs shadow-xs transition cursor-pointer'
        }, 'Create Account')
      )
    })
  );
}`
  },
  {
    id: 'security-sanitizer',
    title: 'Context-Aware Security & URL Sanitization',
    category: 'Security',
    description: 'Real-time demonstration of Samrey compile-time and runtime XSS scheme interception.',
    code: `import { signal, computed } from '@samrey/reactivity';
import { el } from '@samrey/runtime';
import { sanitizeUri, sanitizeCssStyle } from '@samrey/security';

export function SecuritySandboxWidget() {
  const targetUrl = signal('javascript:alert("XSS Attack Blocked")');

  const safeUrl = computed(() => sanitizeUri(targetUrl.value));
  const isUrlBlocked = computed(() => safeUrl.value === 'about:blank' || safeUrl.value === '');

  return el('div', { class: 'p-6 bg-white rounded-2xl border border-slate-200 shadow-sm space-y-4 max-w-md mx-auto' },
    el('div', { class: 'pb-3 border-b border-slate-100' },
      el('h3', { class: 'font-bold text-slate-900 text-base flex items-center space-x-2' },
        el('span', null, '🛡️ Context Security Classifier')
      ),
      el('p', { class: 'text-xs text-slate-500' }, 'Automatic neutralization of dangerous schemes and injection vectors')
    ),
    // URL Section
    el('div', { class: 'space-y-2' },
      el('label', { class: 'text-xs font-semibold text-slate-700' }, 'Test Target URL:'),
      el('input', {
        type: 'text',
        class: 'w-full px-3 py-2 bg-slate-50 rounded-xl border border-slate-200 text-xs font-mono',
        value: () => targetUrl.value,
        onInput: (e) => { targetUrl.value = e.target.value; }
      }),
      el('div', {
        class: () => \`p-3 rounded-xl border text-xs font-mono space-y-1 \${
          isUrlBlocked.value
            ? 'bg-rose-50 border-rose-200 text-rose-800'
            : 'bg-emerald-50 border-emerald-200 text-emerald-800'
        }\`
      },
        el('div', { class: 'font-bold' }, () => isUrlBlocked.value ? '🚨 DANGEROUS SCHEME BLOCKED' : '✓ SAFE URL ALLOWED'),
        el('div', null, () => \`Evaluated href: "\${safeUrl.value}"\`)
      )
    ),
    // Quick scheme presets
    el('div', { class: 'flex flex-wrap gap-1.5 pt-1' },
      el('button', {
        type: 'button',
        class: 'px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-mono cursor-pointer',
        onClick: () => { targetUrl.value = 'https://samrey.dev/docs'; }
      }, 'Safe HTTPS Link'),
      el('button', {
        type: 'button',
        class: 'px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-lg text-xs font-mono cursor-pointer border border-rose-200',
        onClick: () => { targetUrl.value = 'javascript:document.cookie'; }
      }, 'javascript: Attack'),
      el('button', {
        type: 'button',
        class: 'px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-lg text-xs font-mono cursor-pointer border border-rose-200',
        onClick: () => { targetUrl.value = 'data:text/html,<script>alert(1)</script>'; }
      }, 'data: URI Attack')
    )
  );
}`
  }
];

function findMatchingDelimiter(src: string, openIdx: number, openChar: string, closeChar: string): number {
  let depth = 0;
  let i = openIdx;
  while (i < src.length) {
    const ch = src[i];
    if (ch === "'" || ch === '"' || ch === '`') {
      i = skipStringOrTemplate(src, i);
      continue;
    }
    if (ch === '/' && src[i + 1] === '/') {
      const nl = src.indexOf('\n', i + 2);
      i = nl === -1 ? src.length : nl + 1;
      continue;
    }
    if (ch === '/' && src[i + 1] === '*') {
      const end = src.indexOf('*/', i + 2);
      i = end === -1 ? src.length : end + 2;
      continue;
    }
    if (ch === openChar) depth++;
    else if (ch === closeChar) {
      depth--;
      if (depth === 0) return i;
    }
    i++;
  }
  return -1;
}

function skipStringOrTemplate(src: string, start: number): number {
  const quote = src[start];
  let i = start + 1;
  while (i < src.length) {
    const ch = src[i];
    if (ch === '\\') {
      i += 2;
      continue;
    }
    if (quote === '`' && ch === '$' && src[i + 1] === '{') {
      const closeBrace = findMatchingDelimiter(src, i + 1, '{', '}');
      if (closeBrace === -1) return src.length;
      i = closeBrace + 1;
      continue;
    }
    if (ch === quote) return i + 1;
    i++;
  }
  return src.length;
}

function stripParamListAnnotations(paramsRaw: string): string {
  const parts: string[] = [];
  let segStart = 0;
  let depthParen = 0;
  let depthBrace = 0;
  let depthBracket = 0;
  let depthAngle = 0;

  const pushSegment = (raw: string) => {
    // Only strip trailing `? : Type` before default `=` initializer at parameter top level
    let eqIdx = -1;
    let p = 0, b = 0, k = 0, a = 0;
    let colonIdx = -1;
    for (let i = 0; i < raw.length; i++) {
      const ch = raw[i];
      if (ch === "'" || ch === '"' || ch === '`') {
        i = skipStringOrTemplate(raw, i) - 1;
        continue;
      }
      if (ch === '(') p++;
      else if (ch === ')') p--;
      else if (ch === '{') b++;
      else if (ch === '}') b--;
      else if (ch === '[') k++;
      else if (ch === ']') k--;
      else if (ch === '<' && raw[i + 1] !== '=' && raw[i - 1] !== '=') a++;
      else if (ch === '>' && raw[i - 1] !== '=' && a > 0) a--;
      else if (p === 0 && b === 0 && k === 0 && a === 0) {
        if (ch === ':' && colonIdx === -1) colonIdx = i;
        else if (ch === '=' && eqIdx === -1) {
          eqIdx = i;
          break;
        }
      }
    }

    if (colonIdx !== -1 && (eqIdx === -1 || colonIdx < eqIdx)) {
      const namePart = raw.slice(0, colonIdx).replace(/\?\s*$/, '');
      const defaultPart = eqIdx !== -1 ? ' ' + raw.slice(eqIdx) : '';
      parts.push(namePart + defaultPart);
    } else {
      parts.push(raw);
    }
  };

  for (let i = 0; i < paramsRaw.length; i++) {
    const ch = paramsRaw[i];
    if (ch === "'" || ch === '"' || ch === '`') {
      i = skipStringOrTemplate(paramsRaw, i) - 1;
      continue;
    }
    if (ch === '(') depthParen++;
    else if (ch === ')') depthParen--;
    else if (ch === '{') depthBrace++;
    else if (ch === '}') depthBrace--;
    else if (ch === '[') depthBracket++;
    else if (ch === ']') depthBracket--;
    else if (ch === '<' && paramsRaw[i + 1] !== '=' && paramsRaw[i - 1] !== '=') depthAngle++;
    else if (ch === '>' && paramsRaw[i - 1] !== '=' && depthAngle > 0) depthAngle--;
    else if (ch === ',' && depthParen === 0 && depthBrace === 0 && depthBracket === 0 && depthAngle === 0) {
      pushSegment(paramsRaw.slice(segStart, i));
      segStart = i + 1;
    }
  }
  pushSegment(paramsRaw.slice(segStart));
  return parts.join(',');
}

/**
 * Strips TypeScript types and module declarations cleanly without corrupting string literals or object keys
 */
export function sanitizeTypeScriptCode(source: string): string {
  // Mask strings & comments while tokenizing so literal colons, classes, and quotes stay untouched
  let { masked: work, literals } = maskNonCodeRegions(source);

  // 1. Remove import statements (single-line or multi-line named imports)
  work = work.replace(/^\s*import\s+(?:type\s+)?(?:[\s\S]*?\s+from\s+)?\u0000TSLIT_\d+\u0000\s*;?/gm, '');

  // 2. Remove export modifiers
  work = work.replace(/\bexport\s+type\s+\{[^}]*\}\s*;?/g, '');
  work = work.replace(/\bexport\s+default\s+/g, '');
  work = work.replace(/\bexport\s+/g, '');

  // 3. Remove interface and type declarations with balanced brace matching
  work = work.replace(/\binterface\s+[A-Za-z0-9_$]+(?:<[^>\n]*>)?\s*(?:extends\s+[^{]+)?\{/g, () => '\u0000DROP_BLOCK\u0000{');
  while (work.includes('\u0000DROP_BLOCK\u0000{')) {
    const markerIdx = work.indexOf('\u0000DROP_BLOCK\u0000{');
    const braceIdx = markerIdx + '\u0000DROP_BLOCK\u0000'.length;
    const closeIdx = findMatchingDelimiter(work, braceIdx, '{', '}');
    if (closeIdx === -1) break;
    work = work.slice(0, markerIdx) + work.slice(closeIdx + 1);
  }
  work = work.replace(/\btype\s+[A-Za-z0-9_$]+(?:<[^>\n]*>)?\s*=\s*(?:\{[\s\S]*?\}|[^;\n]+);?/g, '');

  // 4. Remove type assertions ('expr as TypeName') and simple generic call args ('fn<Type>(')
  work = work.replace(/\s+as\s+[A-Za-z0-9_$]+(?:\.[A-Za-z0-9_$]+)*(?:<[^>\n]*>)?(?:\[\])*/g, '');
  work = work.replace(/([A-Za-z0-9_$])<[A-Za-z0-9_$,\s|&<>[\]{}'":.?]+>(?=\s*\()/g, '$1');

  // 5. Strip typed variable declarations: `const x: Foo<Bar>[] =`
  work = work.replace(/(\b(?:const|let|var)\s+[A-Za-z0-9_$]+)\s*:\s*[^=;\n]+(?==)/g, '$1 ');

  // 6. Strip TypeScript parameter and return annotations on function declarations and arrow functions
  let out = '';
  let idx = 0;
  while (idx < work.length) {
    const fnMatch = /^(?:function(?:\s+[A-Za-z0-9_$]+)?\s*|=>)/.exec(work.slice(idx));
    const funcDeclMatch = /^function(?:\s+[A-Za-z0-9_$]+)?(?:\s*<[^>\n]*>)?\s*\(/.exec(work.slice(idx));
    if (funcDeclMatch) {
      const openParen = idx + funcDeclMatch[0].length - 1;
      const closeParen = findMatchingDelimiter(work, openParen, '(', ')');
      if (closeParen !== -1) {
        const headerWithoutGeneric = funcDeclMatch[0].replace(/<[^>\n]*>\s*\($/, '(');
        const cleanParams = stripParamListAnnotations(work.slice(openParen + 1, closeParen));
        // Check for optional ': ReturnType {' before body brace
        const afterParen = work.slice(closeParen + 1);
        const retMatch = /^\s*:\s*[^{;=\n]+(?=\{)/.exec(afterParen);
        out += headerWithoutGeneric.slice(0, -1) + '(' + cleanParams + ')';
        idx = closeParen + 1 + (retMatch ? retMatch[0].length : 0);
        continue;
      }
    }

    // Arrow function `(params)[: ReturnType] =>`
    if (work[idx] === '(') {
      const prevCharMatch = work.slice(0, idx).match(/([A-Za-z0-9_$.])\s*$/);
      const prevIdent = work.slice(0, idx).match(/([A-Za-z0-9_$]+)\s*$/)?.[1];
      const isCallArg = prevCharMatch && !['return', 'async', 'await', 'throw', 'typeof', 'yield'].includes(prevIdent || '');
      const closeParen = findMatchingDelimiter(work, idx, '(', ')');
      if (!isCallArg && closeParen !== -1) {
        const afterArrow = /^\s*(?::\s*[^=>{;\n]+)?\s*=>/.exec(work.slice(closeParen + 1));
        if (afterArrow) {
          const cleanParams = stripParamListAnnotations(work.slice(idx + 1, closeParen));
          out += '(' + cleanParams + ') =>';
          idx = closeParen + 1 + afterArrow[0].length;
          continue;
        }
      }
    }

    if (fnMatch && fnMatch[0] === '=>') {
      out += '=>';
      idx += 2;
      continue;
    }

    out += work[idx];
    idx++;
  }

  // Restore original string literals & template literals verbatim (also cleaning any nested TS syntax inside strings untouched)
  return out.replace(/\u0000TSLIT_(\d+)\u0000/g, (_, n: string) => literals[Number(n)] ?? '').trim();
}

function maskNonCodeRegions(source: string): { masked: string; literals: string[] } {
  const literals: string[] = [];
  let masked = '';
  let i = 0;

  while (i < source.length) {
    const ch = source[i];
    if (ch === "'" || ch === '"' || ch === '`') {
      const end = skipStringOrTemplate(source, i);
      const raw = source.slice(i, end);
      const token = `\u0000TSLIT_${literals.length}\u0000`;
      literals.push(raw);
      masked += token;
      // Preserve interpolated `${expr}` snippets cleanly in comment-free scan? Actually keep raw for restore; security check inspects nested expressions separately.
      i = end;
      continue;
    }
    if (ch === '/' && source[i + 1] === '/') {
      const nl = source.indexOf('\n', i + 2);
      i = nl === -1 ? source.length : nl;
      masked += ' ';
      continue;
    }
    if (ch === '/' && source[i + 1] === '*') {
      const end = source.indexOf('*/', i + 2);
      i = end === -1 ? source.length : end + 2;
      masked += ' ';
      continue;
    }
    masked += ch;
    i++;
  }

  return { masked, literals };
}

function stripStringsAndCommentsWithBracketCheck(source: string): { codeOnly: string; blockedBracketProp: boolean } {
  const { masked, literals } = maskNonCodeRegions(source);
  const extraExprs: string[] = [];
  for (const lit of literals) {
    if (lit.startsWith('`')) {
      let j = 1;
      while (j < lit.length - 1) {
        if (lit[j] === '\\') {
          j += 2;
          continue;
        }
        if (lit[j] === '$' && lit[j + 1] === '{') {
          const closeBrace = findMatchingDelimiter(lit, j + 1, '{', '}');
          if (closeBrace === -1) break;
          const inner = stripStringsAndCommentsWithBracketCheck(lit.slice(j + 2, closeBrace));
          if (inner.blockedBracketProp) {
            return { codeOnly: '', blockedBracketProp: true };
          }
          extraExprs.push(inner.codeOnly);
          j = closeBrace + 1;
          continue;
        }
        j++;
      }
    }
  }
  const combined = masked + (extraExprs.length > 0 ? '\n' + extraExprs.join('\n') : '');
  const bracketTokenRe = /\[\s*\u0000TSLIT_(\d+)\u0000\s*\]/g;
  let match: RegExpExecArray | null;
  while ((match = bracketTokenRe.exec(combined)) !== null) {
    const rawLit = literals[Number(match[1])];
    if (rawLit && (rawLit.startsWith("'") || rawLit.startsWith('"') || rawLit.startsWith('`'))) {
      const inner = rawLit.slice(1, -1);
      if (inner === 'constructor' || inner === '__proto__' || inner === 'prototype') {
        return { codeOnly: combined, blockedBracketProp: true };
      }
    }
  }
  return { codeOnly: combined, blockedBracketProp: false };
}

function stripStringsAndComments(source: string): string {
  return stripStringsAndCommentsWithBracketCheck(source).codeOnly;
}

export function validateSandboxCodeSafety(source: string): string | null {
  const { codeOnly, blockedBracketProp } = stripStringsAndCommentsWithBracketCheck(source);
  if (
    blockedBracketProp ||
    /\.(?:constructor|__proto__|prototype)\b|\[\s*(?:constructor|__proto__|prototype)\s*\]/.test(codeOnly)
  ) {
    return 'Blocked prototype/constructor chain access inside sandbox.';
  }
  const blockedPatterns: Array<[RegExp, string]> = [
    [/\beval\b/, 'Dynamic eval() execution is prohibited in the Samrey sandbox.'],
    [/\bnew\s+Function\b|\bFunction\s*\(/, 'Dynamic Function() construction is prohibited in the Samrey sandbox.'],
    [/\bimport\s*\(/, 'Dynamic import() is prohibited inside the Samrey sandbox.'],
    [/\b(?:window|globalThis|self|top|parent|frames)\b/, 'Direct global window/frame access is isolated inside the Samrey sandbox.'],
    [/\b(?:document|localStorage|sessionStorage|indexedDB|cookieStore|navigator|location|history)\b/, 'Direct browser DOM storage/navigation APIs are isolated inside the Samrey sandbox.'],
    [/\b(?:fetch|XMLHttpRequest|WebSocket|EventSource|importScripts)\b/, 'Network/worker primitives are blocked inside the Samrey sandbox; use createResource with safe mocks.'],
    [/\b(?:Reflect|Proxy)\b/, 'Meta-programming Reflect/Proxy escape hatches are blocked inside the Samrey sandbox.'],
    [/\.(?:innerHTML|outerHTML|insertAdjacentHTML)\b/, 'Raw HTML injection sinks are blocked inside the Samrey sandbox; use el() or rawHtml().']
  ];

  for (const [pattern, reason] of blockedPatterns) {
    if (pattern.test(codeOnly)) {
      return reason;
    }
  }
  return null;
}

/**
 * Executes a Samrey code block in a sandboxed, reactive runtime environment
 */
export function executeSamreyCode(
  rawCode: string,
  onLog?: (msg: string, type: 'info' | 'success' | 'warn' | 'error') => void
): ExecutionResult {
  const log = onLog || (() => {});

  try {
    const cleanCode = sanitizeTypeScriptCode(rawCode);
    const violation = validateSandboxCodeSafety(cleanCode);
    if (violation) {
      log(`[Sandbox Security] ${violation}`, 'error');
      return { success: false, error: violation };
    }

    log('[AST Transpiler] Stripped TypeScript type signatures. Preparing reactive scope...', 'info');

    // Create execution scope with all @samrey/* primitives and explicit global isolation
    const scope = {
      window: undefined,
      globalThis: undefined,
      self: undefined,
      top: undefined,
      parent: undefined,
      frames: undefined,
      document: undefined,
      fetch: undefined,
      XMLHttpRequest: undefined,
      WebSocket: undefined,
      EventSource: undefined,
      navigator: undefined,
      location: undefined,
      history: undefined,
      localStorage: undefined,
      sessionStorage: undefined,
      indexedDB: undefined,
      cookieStore: undefined,
      Function: undefined,
      importScripts: undefined,
      Reflect: undefined,
      Proxy: undefined,
      // Reactivity
      signal: Reactivity.signal,
      computed: Reactivity.computed,
      effect: Reactivity.effect,
      batch: Reactivity.batch,
      untrack: Reactivity.untrack,
      createStore: Reactivity.createStore,
      produce: Reactivity.produce,
      onCleanup: Reactivity.onCleanup,
      createOwner: Reactivity.createOwner,
      runWithOwner: Reactivity.runWithOwner,

      // Runtime DOM & Control Flow
      el: Runtime.el,
      svgEl: Runtime.svgEl,
      text: Runtime.text,
      frag: Runtime.frag,
      rawHtml: Runtime.rawHtml,
      Show: Runtime.Show,
      For: Runtime.For,
      bindText: Runtime.bindText,
      bindAttr: Runtime.bindAttr,
      bindClass: Runtime.bindClass,
      on: Runtime.on,
      createComponent: Runtime.createComponent,

      // Forms
      createForm: Forms.createForm,
      createField: Forms.createField,
      computeAriaAttributes: Forms.computeAriaAttributes,
      getAccessibleFieldProps: Forms.getAccessibleFieldProps,

      // Security
      sanitizeUri: Security.sanitizeUri,
      sanitizeRedirectUri: Security.sanitizeRedirectUri,
      sanitizeCssStyle: Security.sanitizeCssStyle,
      escapeHtmlAttribute: Security.escapeHtmlAttribute,
      escapeHtmlText: Security.escapeHtmlText,
      scrubPrototypePollution: Security.scrubPrototypePollution,
      stripSecrets: Security.stripSecrets,

      // HTTP
      createResource: Http.createResource,
      createHttpClient: Http.createHttpClient,
      createHttpCache: Http.createHttpCache,
      RequestCache: Http.RequestCache,

      // Helpers
      icon,
      setTimeout: (fn: unknown, delay?: number, ...args: unknown[]) => {
        if (typeof fn !== 'function') {
          throw new TypeError('[Sandbox Security] setTimeout requires a function callback.');
        }
        return setTimeout(fn as (...a: unknown[]) => void, delay, ...args);
      },
      setInterval: (fn: unknown, delay?: number, ...args: unknown[]) => {
        if (typeof fn !== 'function') {
          throw new TypeError('[Sandbox Security] setInterval requires a function callback.');
        }
        return setInterval(fn as (...a: unknown[]) => void, delay, ...args);
      },
      console: {
        log: (...args: any[]) => {
          log(args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' '), 'info');
        },
        warn: (...args: any[]) => {
          log(args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' '), 'warn');
        },
        error: (...args: any[]) => {
          log(args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' '), 'error');
        }
      }
    };

    log('[Runtime] Executing component entry function via zero-eval AST sandbox...', 'info');

    // Run inside reactive owner via zero-Function AST interpreter
    const owner = Reactivity.createOwner();
    let renderedResult: any = null;

    Reactivity.runWithOwner(owner, () => {
      renderedResult = evaluateSandboxedProgram(cleanCode, scope, []);
    });

    if (renderedResult && typeof renderedResult === 'object' && ('nodeType' in renderedResult || renderedResult instanceof Node)) {
      log('[Runtime] Component tree mounted successfully. Active reactive bindings registered.', 'success');
      return { success: true, node: renderedResult as Node };
    }

    // Fallback: If code returned primitive or object or nothing (pure logic)
    const fallbackNode = Runtime.el('div', { class: 'p-4 bg-indigo-50/70 rounded-xl border border-indigo-100 space-y-2 text-xs font-mono text-indigo-900' },
      Runtime.el('div', { class: 'font-bold flex items-center space-x-1.5' },
        icon('check-circle', 'w-4 h-4 text-indigo-600'),
        Runtime.el('span', null, 'Execution Completed (Non-DOM Return Value)')
      ),
      Runtime.el('pre', { class: 'p-3 bg-white rounded-lg border border-indigo-100 text-slate-800' },
        renderedResult !== undefined ? JSON.stringify(renderedResult, null, 2) : '/* Code executed without explicit DOM return */'
      )
    );

    log('[Runtime] Script evaluated without fatal errors.', 'success');
    return { success: true, node: fallbackNode };
  } catch (err: any) {
    const errMsg = err?.message || String(err);
    log(`[Execution Error] ${errMsg}`, 'error');
    return { success: false, error: errMsg };
  }
}
