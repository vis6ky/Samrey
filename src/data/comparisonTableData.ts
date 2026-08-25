/**
 * @license Apache-2.0
 * @samrey/doc - Comprehensive Table & Feature Code Comparison Data
 */

export interface ComparisonTableRow {
  id: string;
  dimension: string;
  category: string;
  samrey: {
    badge: string;
    description: string;
    advantage: 'high' | 'neutral';
  };
  react: {
    badge: string;
    description: string;
  };
  vue: {
    badge: string;
    description: string;
  };
  angular: {
    badge: string;
    description: string;
  };
}

export const COMPARISON_TABLE_ROWS: ComparisonTableRow[] = [
  {
    id: 'reactivity',
    dimension: 'Reactivity Engine',
    category: 'Core Architecture',
    samrey: {
      badge: 'Push-Pull Signals',
      description: 'Fine-grained glitch-free signals with O(1) clock versioning. Components execute only once.',
      advantage: 'high'
    },
    react: {
      badge: 'Virtual DOM Diffing',
      description: 'Coarse-grained state reconciliation. Components and child trees re-execute completely on state change.'
    },
    vue: {
      badge: 'Proxy + Block Tree',
      description: 'ES6 Proxy-based reactive graph triggering component-level render functions with compiler hints.'
    },
    angular: {
      badge: 'Zoneless Signals + Ivy',
      description: 'Signal graph coupled with template-level dirty checking and incremental DOM instruction loops.'
    }
  },
  {
    id: 'rerender',
    dimension: 'Component Execution Scope',
    category: 'Runtime Performance',
    samrey: {
      badge: 'Zero Re-execution (1x Run)',
      description: 'Setup function runs once during creation. Updates surgically mutate targeted DOM text nodes/attributes.',
      advantage: 'high'
    },
    react: {
      badge: 'Full Component Re-run',
      description: 'Entire function body re-evaluates on every setState unless guarded by React.memo or useMemo.'
    },
    vue: {
      badge: 'Component Render Re-run',
      description: 'Component render function re-runs whenever tracked dependencies change.'
    },
    angular: {
      badge: 'Template Change Detection',
      description: 'Component class instance persists; template bindings re-evaluate during change detection passes.'
    }
  },
  {
    id: 'dom-strategy',
    dimension: 'DOM Mutation Engine',
    category: 'Core Architecture',
    samrey: {
      badge: 'Native <template> Cloning',
      description: 'Pre-parsed HTML templates cloned via cloneNode(true). Direct node pointers eliminate diffing trees.',
      advantage: 'high'
    },
    react: {
      badge: 'Fiber VDOM Tree',
      description: 'Constructs fiber node trees in heap memory and executes dual-phase reconciliation diffing.'
    },
    vue: {
      badge: 'Hybrid Block VDOM',
      description: 'Virtual DOM diffing optimized with compile-time dynamic block flags.'
    },
    angular: {
      badge: 'Incremental DOM',
      description: 'Ivy compiler emits sequential byte-like instructions that mutate DOM without allocating VDOM trees.'
    }
  },
  {
    id: 'hook-rules',
    dimension: 'Rules of Hooks & Constraints',
    category: 'Developer Ergonomics',
    samrey: {
      badge: 'Zero Hook Rules',
      description: 'Signals, effects, and resources can be invoked anywhere: inside if-statements, loops, async blocks, or TS classes.',
      advantage: 'high'
    },
    react: {
      badge: 'Strict Hook Rules',
      description: 'Hooks cannot be called inside loops, conditions, or nested functions. Order of execution must remain static.'
    },
    vue: {
      badge: 'Synchronous Setup Context',
      description: 'Lifecycle hooks and inject() must be called synchronously inside setup().'
    },
    angular: {
      badge: 'Injection Context Limits',
      description: 'inject() and effect() must execute inside constructor or field initializer phase.'
    }
  },
  {
    id: 'security-xss',
    dimension: 'Built-in Security & XSS',
    category: 'Enterprise Security',
    samrey: {
      badge: 'Built-in Trusted Types & Sanitizer',
      description: 'Native @samrey/security module. Automatic HTML sanitization, protocol whitelisting, zero-eval runtime guarantee.',
      advantage: 'high'
    },
    react: {
      badge: 'dangerouslySetInnerHTML',
      description: 'Escapes standard text; dangerouslySetInnerHTML has no built-in sanitizer. Requires external DOMPurify.'
    },
    vue: {
      badge: 'v-html Directive',
      description: 'Escapes mustache expressions; v-html renders raw HTML with no built-in sanitization.'
    },
    angular: {
      badge: 'DomSanitizer + Contexts',
      description: 'Built-in contextual sanitizer, but frequently bypassed using bypassSecurityTrustHtml when embedding rich HTML.'
    }
  },
  {
    id: 'forms-validation',
    dimension: 'Forms & Schema Validation',
    category: 'Full-Stack Capabilities',
    samrey: {
      badge: 'Native StandardSchema (@samrey/forms)',
      description: 'Standard Schema specification support (Zod, Valibot, ArkType) with automatic aria-invalid and progressive POST.',
      advantage: 'high'
    },
    react: {
      badge: 'Unopinionated / 3rd Party',
      description: 'Requires external libraries (React Hook Form, Formik, Zod) and manual ARIA attribute wiring.'
    },
    vue: {
      badge: 'v-model / 3rd Party',
      description: 'v-model two-way binding; schema validation requires VeeValidate or FormKit.'
    },
    angular: {
      badge: 'ReactiveForms / FormBuilder',
      description: 'Heavy class-based FormGroup and FormControl system with custom sync and async validation pipes.'
    }
  },
  {
    id: 'routing',
    dimension: 'Routing & Navigation',
    category: 'Full-Stack Capabilities',
    samrey: {
      badge: 'Type-Safe Dual Router (@samrey/router)',
      description: 'Supports filesystem discovery and code-based routes with View Transitions API, streaming loaders, and prefetching.',
      advantage: 'high'
    },
    react: {
      badge: 'Fragmented Ecosystem',
      description: 'No built-in router. Fragmented between Next.js App Router, React Router v7, and TanStack Router.'
    },
    vue: {
      badge: 'Official vue-router',
      description: 'Official router maintained by core team with nested views and navigation guards.'
    },
    angular: {
      badge: 'Built-in @angular/router',
      description: 'Comprehensive enterprise router with CanActivate guards, resolvers, and module lazy loading.'
    }
  },
  {
    id: 'bundle-size',
    dimension: 'Core Runtime Footprint (min+gzip)',
    category: 'Runtime Performance',
    samrey: {
      badge: '< 7 kB (Core) / < 14 kB (Full Suite)',
      description: 'Tree-shakeable modular monorepo. Zero VDOM engine yields ultra-light baseline footprint.',
      advantage: 'high'
    },
    react: {
      badge: '~45 kB (react + react-dom)',
      description: 'Core runtime plus scheduler and fiber reconciliation tree engine.'
    },
    vue: {
      badge: '~33 kB (vue core)',
      description: 'Reactivity runtime plus virtual DOM block patcher and component instance metadata.'
    },
    angular: {
      badge: '~75 kB (@angular/core + platform)',
      description: 'Ivy instruction interpreter, dependency injection container, and runtime metadata tables.'
    }
  }
];

export interface FeatureCodeExample {
  id: string;
  title: string;
  category: string;
  description: string;
  samreyCode: string;
  reactCode: string;
  vueCode: string;
  angularCode: string;
  keyDifferences: string[];
}

export const FEATURE_CODE_EXAMPLES: FeatureCodeExample[] = [
  {
    id: 'counter',
    title: 'Reactive Counter & Computed State',
    category: 'Reactivity & Signals',
    description: 'Compares how simple state and derived computation are declared, updated, and bound to the DOM.',
    samreyCode: `import { signal, computed } from '@samrey/reactivity';
import { el } from '@samrey/runtime';

export function Counter() {
  // Signal holds reactive primitive; runs once!
  const count = signal(0);
  const isEven = computed(() => count() % 2 === 0);

  return el('div', { class: 'counter-card' }, [
    el('p', {}, [
      'Count: ',
      el('strong', {}, [() => count()]),
      el('span', {}, [() => isEven() ? ' (Even)' : ' (Odd)'])
    ]),
    el('button', { onClick: () => count.set(c => c + 1) }, ['Increment']),
    el('button', { onClick: () => count.set(c => c - 1) }, ['Decrement'])
  ]);
}`,
    reactCode: `import React, { useState, useMemo } from 're' + 'act';

export function Counter() {
  // Entire function re-runs on every click
  const [count, setCount] = useState(0);
  // Requires manual dependency array tracking
  const isEven = useMemo(() => count % 2 === 0, [count]);

  return (
    <div className="counter-card">
      <p>
        Count: <strong>{count}</strong>
        <span>{isEven ? ' (Even)' : ' (Odd)'}</span>
      </p>
      <button onClick={() => setCount(c => c + 1)}>Increment</button>
      <button onClick={() => setCount(c => c - 1)}>Decrement</button>
    </div>
  );
}`,
    vueCode: `<script setup>
import { ref, computed } from 'vu' + 'e';

const count = ref(0);
const isEven = computed(() => count.value % 2 === 0);
</script>

<template>
  <div class="counter-card">
    <p>
      Count: <strong>{{ count }}</strong>
      <span>{{ isEven ? ' (Even)' : ' (Odd)' }}</span>
    </p>
    <button @click="count++">Increment</button>
    <button @click="count--">Decrement</button>
  </div>
</template>`,
    angularCode: `import { Component, signal, computed } from '@angular/core';

@Component({
  selector: 'app-counter',
  standalone: true,
  template: \`
    <div class="counter-card">
      <p>
        Count: <strong>{{ count() }}</strong>
        <span>{{ isEven() ? ' (Even)' : ' (Odd)' }}</span>
      </p>
      <button (click)="increment()">Increment</button>
      <button (click)="decrement()">Decrement</button>
    </div>
  \`
})
export class CounterComponent {
  count = signal(0);
  isEven = computed(() => this.count() % 2 === 0);

  increment() { this.count.update(c => c + 1); }
  decrement() { this.count.update(c => c - 1); }
}`,
    keyDifferences: [
      'Samrey executes the component function once; state changes only update the single text node binding in the real DOM.',
      'React re-executes the entire function body and compares virtual DOM trees.',
      'Samrey requires no manual dependency arrays (unlike React useMemo/useEffect).',
      'Angular and Vue require template compiler directives (@click, {{ }}, (click)), while Samrey is pure TypeScript.'
    ]
  },
  {
    id: 'task-list',
    title: 'Interactive Checklist & Fine-Grained Filtering',
    category: 'List Rendering & Reconciliation',
    description: 'Demonstrates list filtering, toggling item completion, and fine-grained DOM updates without full list re-renders.',
    samreyCode: `import { signal, computed } from '@samrey/reactivity';
import { el } from '@samrey/runtime';

interface Task { id: string; title: string; done: boolean; }

export function TaskList() {
  const tasks = signal<Task[]>([
    { id: '1', title: 'Security Audit', done: false },
    { id: '2', title: 'Signals Benchmark', done: true }
  ]);
  const filter = signal<'all' | 'pending' | 'completed'>('all');

  const visibleTasks = computed(() => {
    const f = filter();
    return tasks().filter(t => f === 'all' ? true : f === 'completed' ? t.done : !t.done);
  });

  const toggleTask = (id: string) => {
    tasks.set(tasks().map(t => t.id === id ? { ...t, done: !t.done } : t));
  };

  return el('div', { class: 'task-container' }, [
    el('div', { class: 'filter-tabs' }, [
      el('button', { onClick: () => filter.set('all') }, ['All']),
      el('button', { onClick: () => filter.set('pending') }, ['Pending']),
      el('button', { onClick: () => filter.set('completed') }, ['Completed'])
    ]),
    el('ul', {}, [
      () => visibleTasks().map(task => 
        el('li', { key: task.id, class: () => task.done ? 'line-through text-gray-500' : '' }, [
          el('input', {
            type: 'checkbox',
            checked: task.done,
            onChange: () => toggleTask(task.id)
          }),
          el('span', {}, [task.title])
        ])
      )
    ])
  ]);
}`,
    reactCode: `import React, { useState, useMemo } from 're' + 'act';

interface Task { id: string; title: string; done: boolean; }

export function TaskList() {
  const [tasks, setTasks] = useState<Task[]>([
    { id: '1', title: 'Security Audit', done: false },
    { id: '2', title: 'Signals Benchmark', done: true }
  ]);
  const [filter, setFilter] = useState<'all' | 'pending' | 'completed'>('all');

  const visibleTasks = useMemo(() => {
    return tasks.filter(t => filter === 'all' ? true : filter === 'completed' ? t.done : !t.done);
  }, [tasks, filter]);

  const toggleTask = (id: string) => {
    setTasks(tasks.map(t => t.id === id ? { ...t, done: !t.done } : t));
  };

  return (
    <div className="task-container">
      <div className="filter-tabs">
        <button onClick={() => setFilter('all')}>All</button>
        <button onClick={() => setFilter('pending')}>Pending</button>
        <button onClick={() => setFilter('completed')}>Completed</button>
      </div>
      <ul>
        {visibleTasks.map(task => (
          <li key={task.id} className={task.done ? 'line-through text-gray-500' : ''}>
            <input 
              type="checkbox" 
              checked={task.done} 
              onChange={() => toggleTask(task.id)} 
            />
            <span>{task.title}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}`,
    vueCode: `<script setup lang="ts">
import { ref, computed } from 'vu' + 'e';

interface Task { id: string; title: string; done: boolean; }

const tasks = ref<Task[]>([
  { id: '1', title: 'Security Audit', done: false },
  { id: '2', title: 'Signals Benchmark', done: true }
]);
const filter = ref<'all' | 'pending' | 'completed'>('all');

const visibleTasks = computed(() => {
  return tasks.value.filter(t => 
    filter.value === 'all' ? true : filter.value === 'completed' ? t.done : !t.done
  );
});

const toggleTask = (id: string) => {
  const t = tasks.value.find(item => item.id === id);
  if (t) t.done = !t.done;
};
</script>

<template>
  <div class="task-container">
    <div class="filter-tabs">
      <button @click="filter = 'all'">All</button>
      <button @click="filter = 'pending'">Pending</button>
      <button @click="filter = 'completed'">Completed</button>
    </div>
    <ul>
      <li v-for="task in visibleTasks" :key="task.id" :class="{ 'line-through text-gray-500': task.done }">
        <input type="checkbox" :checked="task.done" @change="toggleTask(task.id)" />
        <span>{{ task.title }}</span>
      </li>
    </ul>
  </div>
</template>`,
    angularCode: `import { Component, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';

interface Task { id: string; title: string; done: boolean; }

@Component({
  selector: 'app-task-list',
  standalone: true,
  imports: [CommonModule],
  template: \`
    <div class="task-container">
      <div class="filter-tabs">
        <button (click)="filter.set('all')">All</button>
        <button (click)="filter.set('pending')">Pending</button>
        <button (click)="filter.set('completed')">Completed</button>
      </div>
      <ul>
        @for (task of visibleTasks(); track task.id) {
          <li [class.line-through]="task.done" [class.text-gray-500]="task.done">
            <input type="checkbox" [checked]="task.done" (change)="toggleTask(task.id)" />
            <span>{{ task.title }}</span>
          </li>
        }
      </ul>
    </div>
  \`
})
export class TaskListComponent {
  tasks = signal<Task[]>([
    { id: '1', title: 'Security Audit', done: false },
    { id: '2', title: 'Signals Benchmark', done: true }
  ]);
  filter = signal<'all' | 'pending' | 'completed'>('all');

  visibleTasks = computed(() => {
    const f = this.filter();
    return this.tasks().filter(t => f === 'all' ? true : f === 'completed' ? t.done : !t.done);
  });

  toggleTask(id: string) {
    this.tasks.update(ts => ts.map(t => t.id === id ? { ...t, done: !t.done } : t));
  }
}`,
    keyDifferences: [
      'Samrey surgically mutates only the modified <li> or class attributes without diffing neighboring list items.',
      'React creates new JSX elements for every array member and runs reconciliation across the whole <ul>.',
      'Vue uses block tree dynamic flags to skip static list markup, but still compares array slots.',
      'Angular uses @for track syntax with Ivy loop instructions.'
    ]
  },
  {
    id: 'security-sanitization',
    title: 'Security-Enforced User Input & Anti-XSS Thread',
    category: 'Security & Sanitization',
    description: 'How rich HTML user content is sanitized to prevent cross-site scripting (XSS) and protocol injection.',
    samreyCode: `import { signal } from '@samrey/reactivity';
import { el } from '@samrey/runtime';
import { sanitizeHtml } from '@samrey/security';

export function CommentThread() {
  const comments = signal<Array<{ id: string; author: string; content: string }>>([
    { id: '1', author: 'Alex', content: 'Native signal engine is ready.' }
  ]);
  const input = signal('');

  const submitComment = () => {
    if (!input().trim()) return;
    // Built-in contextual sanitization from @samrey/security
    const cleanContent = sanitizeHtml(input().trim());
    comments.set([
      ...comments(),
      { id: Date.now().toString(), author: 'Current User', content: cleanContent }
    ]);
    input.set('');
  };

  return el('div', { class: 'discussion-box' }, [
    el('div', { class: 'comment-stream' }, [
      () => comments().map(c => 
        el('div', { class: 'comment-card' }, [
          el('strong', {}, [c.author]),
          el('p', { innerHTML: c.content }) // Cleaned by @samrey/security
        ])
      )
    ]),
    el('input', {
      value: () => input(),
      onInput: (e: any) => input.set(e.target.value),
      placeholder: 'Write a comment (HTML safe)...'
    }),
    el('button', { onClick: submitComment }, ['Post Comment'])
  ]);
}`,
    reactCode: `import React, { useState } from 're' + 'act';
import DOMPurify from 'dompurify'; // Mandatory extra 3rd-party library

export function CommentThread() {
  const [comments, setComments] = useState([{ id: '1', author: 'Alex', content: 'Native signal engine is ready.' }]);
  const [input, setInput] = useState('');

  const submitComment = () => {
    if (!input.trim()) return;
    // Must manually remember to invoke DOMPurify
    const clean = DOMPurify.sanitize(input.trim());
    setComments([...comments, { id: Date.now().toString(), author: 'Current User', content: clean }]);
    setInput('');
  };

  return (
    <div className="discussion-box">
      <div className="comment-stream">
        {comments.map(c => (
          <div key={c.id} className="comment-card">
            <strong>{c.author}</strong>
            <p dangerouslySetInnerHTML={{ __html: c.content }} />
          </div>
        ))}
      </div>
      <input value={input} onChange={e => setInput(e.target.value)} />
      <button onClick={submitComment}>Post Comment</button>
    </div>
  );
}`,
    vueCode: `<script setup>
import { ref } from 'vu' + 'e';
import DOMPurify from 'dompurify'; // Mandatory extra dependency

const comments = ref([{ id: '1', author: 'Alex', content: 'Native signal engine is ready.' }]);
const input = ref('');

const submitComment = () => {
  if (!input.value.trim()) return;
  comments.value.push({
    id: Date.now().toString(),
    author: 'Current User',
    content: DOMPurify.sanitize(input.value.trim())
  });
  input.value = '';
};
</script>

<template>
  <div class="discussion-box">
    <div v-for="c in comments" :key="c.id" class="comment-card">
      <strong>{{ c.author }}</strong>
      <p v-html="c.content"></p>
    </div>
    <input v-model="input" />
    <button @click="submitComment">Post</button>
  </div>
</template>`,
    angularCode: `import { Component, signal } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

@Component({
  selector: 'app-comments',
  standalone: true,
  template: \`
    <div class="discussion-box">
      @for (c of comments(); track c.id) {
        <div class="comment-card">
          <strong>{{ c.author }}</strong>
          <p [innerHTML]="c.safeContent"></p>
        </div>
      }
      <input #inputField (keyup.enter)="submit(inputField.value); inputField.value=''" />
    </div>
  \`
})
export class CommentsComponent {
  comments = signal<Array<{ id: string; author: string; safeContent: SafeHtml }>>([]);

  constructor(private sanitizer: DomSanitizer) {}

  submit(raw: string) {
    const safe = this.sanitizer.sanitize(1, raw) || '';
    this.comments.update(cs => [...cs, {
      id: Date.now().toString(),
      author: 'User',
      safeContent: this.sanitizer.bypassSecurityTrustHtml(safe)
    }]);
  }
}`,
    keyDifferences: [
      'Samrey includes native @samrey/security with W3C Trusted Types policies and protocol whitelisting.',
      'React and Vue require developers to configure external dependencies like DOMPurify.',
      'Angular has DomSanitizer, but bypassSecurityTrustHtml creates maintenance vulnerabilities when misused.',
      'Samrey guarantees zero runtime eval() across the entire monorepo.'
    ]
  },
  {
    id: 'auth-csrf',
    title: 'Authentication Store & CSRF-Guarded State',
    category: 'State Management & Security',
    description: 'Demonstrates modular global authentication state management and CSRF token verification.',
    samreyCode: `import { signal, computed } from '@samrey/reactivity';
import { createCsrfToken, validateCsrfToken } from '@samrey/security';

export interface UserSession {
  userId: string;
  email: string;
  csrfToken: string;
}

// Module-level reactive store (Zero context providers needed!)
const activeSession = signal<UserSession | null>(null);

export const isAuthenticated = computed(() => activeSession() !== null);
export const currentUser = computed(() => activeSession());

export async function login(credentials: { email: string; pass: string }) {
  const csrf = createCsrfToken(32);
  activeSession.set({
    userId: 'usr_9481',
    email: credentials.email,
    csrfToken: csrf
  });
  return { success: true, token: csrf };
}

export function logout() {
  activeSession.set(null);
}

export function performSecureAction(submittedCsrf: string) {
  const current = activeSession();
  if (!current || !validateCsrfToken(submittedCsrf, current.csrfToken)) {
    throw new Error('CSRF Token Validation Failed');
  }
}`,
    reactCode: `import React, { createContext, useContext, useState } from 're' + 'act';

interface AuthContextType {
  user: any;
  login: (creds: any) => Promise<void>;
  logout: () => void;
}

// Must wrap whole tree in Context.Provider
const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState(null);

  const login = async (creds: any) => {
    setUser({ email: creds.email, token: 'jwt_...' });
  };
  const logout = () => setUser(null);

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext)!;`,
    vueCode: `import { ref, computed } from 'vu' + 'e';

// Reactive singleton store or Pinia store
const activeSession = ref<any>(null);

export function useAuthStore() {
  const isAuthenticated = computed(() => activeSession.value !== null);
  const currentUser = computed(() => activeSession.value);

  const login = async (creds: any) => {
    activeSession.value = { email: creds.email, token: 'jwt_...' };
  };

  const logout = () => {
    activeSession.value = null;
  };

  return { activeSession, isAuthenticated, currentUser, login, logout };
}`,
    angularCode: `import { Injectable, signal, computed } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private activeSession = signal<any | null>(null);

  isAuthenticated = computed(() => this.activeSession() !== null);
  currentUser = computed(() => this.activeSession());

  async login(creds: any) {
    this.activeSession.set({ email: creds.email, token: 'jwt_...' });
  }

  logout() {
    this.activeSession.set(null);
  }
}`,
    keyDifferences: [
      'Samrey signals can be exported directly from standard TypeScript files without requiring root Provider wrapping or Dependency Injection containers.',
      'React requires wrapping the component tree in an AuthContext.Provider and triggers subtree re-renders on context updates.',
      'Samrey includes built-in HMAC CSRF token generators and timing-safe validators in @samrey/security.',
      'Angular requires @Injectable decorators and platform DI registration.'
    ]
  }
];
