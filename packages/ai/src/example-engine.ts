/**
 * @license Apache-2.0
 * @samrey/ai - Native Code Example Engine
 */

export interface SamreyCodeExample {
  id: string;
  title: string;
  domain:
    | 'reactivity'
    | 'components'
    | 'control-flow'
    | 'routing'
    | 'forms'
    | 'http'
    | 'ssr'
    | 'testing'
    | 'security'
    | 'full-app';
  summary: string;
  files: Array<{ filename: string; code: string; language: 'typescript' | 'javascript' | 'html' }>;
  tags: string[];
}

export const SAMREY_EXAMPLES: SamreyCodeExample[] = [
  {
    id: 'reactive-counter',
    title: 'Reactive Counter with Signals and Surgical Text Binding',
    domain: 'reactivity',
    summary: 'A simple counter component showing signal initialization, update, and fine-grained DOM binding.',
    tags: ['signal', 'template', 'on', 'bindText', 'counter'],
    files: [
      {
        filename: 'Counter.ts',
        language: 'typescript',
        code: `import { signal } from '@samrey/reactivity';
import { template, on, bindText } from '@samrey/runtime';

const _tmpl = template('<button ref="btn" type="button" class="px-4 py-2 bg-blue-600 text-white rounded">Count: <span ref="num"></span></button>');

export function Counter(props: { initial?: number }) {
  const count = signal(props.initial ?? 0);
  const root = _tmpl.clone();
  const { btn, num } = root.refs;

  bindText(num, () => count.value.toString());
  on(btn, 'click', () => count.update((n) => n + 1));

  return root;
}`
      }
    ]
  },
  {
    id: 'computed-derivation',
    title: 'Derived State with Computed Signals',
    domain: 'reactivity',
    summary: 'Demonstrates lazy, memoized computations that automatically track multiple signals.',
    tags: ['signal', 'computed', 'derived-state'],
    files: [
      {
        filename: 'CartSummary.ts',
        language: 'typescript',
        code: `import { signal, computed } from '@samrey/reactivity';
import { template, bindText } from '@samrey/runtime';

const _tmpl = template('<div class="cart-box"><p id="sub"></p><p id="tax"></p><h3 id="tot"></h3></div>');

export function CartSummary() {
  const price = signal(100);
  const quantity = signal(2);
  const taxRate = signal(0.1);

  const subtotal = computed(() => price.value * quantity.value);
  const tax = computed(() => subtotal.value * taxRate.value);
  const grandTotal = computed(() => subtotal.value + tax.value);

  const root = _tmpl() as HTMLElement;
  bindText(root.querySelector('#sub')!, () => \`Subtotal: $\${subtotal.value.toFixed(2)}\`);
  bindText(root.querySelector('#tax')!, () => \`Tax: $\${tax.value.toFixed(2)}\`);
  bindText(root.querySelector('#tot')!, () => \`Total: $\${grandTotal.value.toFixed(2)}\`);

  return root;
}`
      }
    ]
  },
  {
    id: 'conditional-show',
    title: 'Conditional Rendering with Show() and Fallback',
    domain: 'control-flow',
    summary: 'Rendering content conditionally with smooth DOM replacement without full component re-runs.',
    tags: ['Show', 'control-flow', 'conditional'],
    files: [
      {
        filename: 'AuthGate.ts',
        language: 'typescript',
        code: `import { signal } from '@samrey/reactivity';
import { Show, template, on } from '@samrey/runtime';

const _tmpl = template('<div class="auth-gate"><header><button type="button" id="toggle">Toggle Login</button></header><main></main></div>');
const _userTmpl = template('<div class="welcome"><h3>Welcome back, Member!</h3><p>Your subscription is active.</p></div>');
const _guestTmpl = template('<div class="login-prompt"><h3>Guest Access</h3><p>Please sign in to continue.</p></div>');

export function AuthGate() {
  const isLoggedIn = signal(false);
  const root = _tmpl() as HTMLElement;

  on(root.querySelector('#toggle')!, 'click', () => {
    isLoggedIn.update((val) => !val);
  });

  const main = root.querySelector('main')!;
  main.appendChild(
    Show({
      when: () => isLoggedIn.value,
      children: () => _userTmpl(),
      fallback: () => _guestTmpl()
    })
  );

  return root;
}`
      }
    ]
  },
  {
    id: 'keyed-list-for',
    title: 'Keyed List Rendering with For() and Identity Preservation',
    domain: 'control-flow',
    summary: 'High-performance keyed list iteration preserving 90%+ DOM node reuse.',
    tags: ['For', 'list', 'keyed', 'reconciliation'],
    files: [
      {
        filename: 'TodoList.ts',
        language: 'typescript',
        code: `import { signal } from '@samrey/reactivity';
import { For, template, on, bindText } from '@samrey/runtime';

interface Todo {
  id: number;
  text: string;
}

const _itemTmpl = template('<li class="todo-item"><span class="txt"></span> <button type="button" class="del">✕</button></li>');
const _listTmpl = template('<div class="todo-container"><ul class="list"></ul><button type="button" id="add">Add Item</button></div>');

export function TodoList() {
  const todos = signal<Todo[]>([
    { id: 1, text: 'Inspect Samrey codebase' },
    { id: 2, text: 'Build AI MCP server' }
  ]);

  const root = _listTmpl() as HTMLElement;
  const ul = root.querySelector('ul')!;

  ul.appendChild(
    For({
      each: () => todos.value,
      key: (item) => item.id,
      children: (item) => {
        const row = _itemTmpl() as HTMLElement;
        bindText(row.querySelector('.txt')!, () => item.text);
        on(row.querySelector('.del')!, 'click', () => {
          todos.value = todos.value.filter((t) => t.id !== item.id);
        });
        return row;
      }
    })
  );

  on(root.querySelector('#add')!, 'click', () => {
    const nextId = Date.now();
    todos.value = [...todos.value, { id: nextId, text: \`New task #\${nextId % 1000}\` }];
  });

  return root;
}`
      }
    ]
  },
  {
    id: 'deep-store-reactivity',
    title: 'Nested State Management with createStore()',
    domain: 'reactivity',
    summary: 'Deep proxy-based reactive object tracking with in-place nested property mutation.',
    tags: ['createStore', 'store', 'proxy', 'state-management'],
    files: [
      {
        filename: 'UserSettings.ts',
        language: 'typescript',
        code: `import { createStore, effect } from '@samrey/reactivity';
import { template, on, bindText } from '@samrey/runtime';

const _tmpl = template('<div class="settings"><p id="theme"></p><button type="button" id="dark">Dark</button><button type="button" id="light">Light</button></div>');

export function UserSettings() {
  const state = createStore({
    user: {
      profile: {
        theme: 'light',
        notifications: true
      }
    }
  });

  const root = _tmpl() as HTMLElement;
  bindText(root.querySelector('#theme')!, () => \`Current theme: \${state.user.profile.theme}\`);

  on(root.querySelector('#dark')!, 'click', () => {
    state.user.profile.theme = 'dark';
  });

  on(root.querySelector('#light')!, 'click', () => {
    state.user.profile.theme = 'light';
  });

  return root;
}`
      }
    ]
  },
  {
    id: 'router-navigation',
    title: 'Declarative Client Routing & RouterOutlet',
    domain: 'routing',
    summary: 'Configuring client-side routes with createRouter, Link, and dynamic parameter consumption.',
    tags: ['router', 'RouterOutlet', 'Link', 'useParams', 'navigation'],
    files: [
      {
        filename: 'AppRouter.ts',
        language: 'typescript',
        code: `import { createRouter, RouterOutlet, Link, useParams } from '@samrey/router';
import { template, bindText } from '@samrey/runtime';

const _homeTmpl = template('<div class="page"><h2>Home Dashboard</h2></div>');
const _userTmpl = template('<div class="page"><h2>User Profile</h2><p id="uid"></p></div>');
const _navTmpl = template('<nav class="nav"><div class="links"></div><main class="content"></main></nav>');

function Home() {
  return _homeTmpl();
}

function User() {
  const params = useParams();
  const root = _userTmpl() as HTMLElement;
  bindText(root.querySelector('#uid')!, () => \`User ID: \${params.value.id || 'none'}\`);
  return root;
}

export function App() {
  const router = createRouter([
    { path: '/', component: Home },
    { path: '/user/:id', component: User }
  ]);

  const root = _navTmpl() as HTMLElement;
  const links = root.querySelector('.links')!;
  links.appendChild(Link({ href: '/', children: 'Home' }));
  links.appendChild(Link({ href: '/user/42', children: 'User 42' }));

  const content = root.querySelector('.content')!;
  content.appendChild(RouterOutlet());

  return root;
}`
      }
    ]
  },
  {
    id: 'async-http-resource',
    title: 'Async Data Fetching with createResource()',
    domain: 'http',
    summary: 'Reactive resource state with automatic loading, error, and data propagation.',
    tags: ['createResource', 'fetch', 'http', 'async'],
    files: [
      {
        filename: 'UserProfile.ts',
        language: 'typescript',
        code: `import { createResource } from '@samrey/http';
import { Show, template, on, bindText } from '@samrey/runtime';

interface UserData {
  id: number;
  name: string;
  email: string;
}

const _tmpl = template('<div class="profile-card"><div class="view"></div><button type="button" id="reload">Reload</button></div>');
const _userTmpl = template('<div class="details"><h3 id="name"></h3><p id="email"></p></div>');
const _loadingTmpl = template('<div class="loading">Fetching user data...</div>');
const _errorTmpl = template('<div class="error">Failed to load user.</div>');

export function UserProfile(props: { userId: number }) {
  const [user, { refetch }] = createResource<UserData>(async () => {
    const res = await fetch(\`/api/users/\${props.userId}\`);
    if (!res.ok) throw new Error('Network error');
    return res.json();
  });

  const root = _tmpl() as HTMLElement;
  const view = root.querySelector('.view')!;

  view.appendChild(
    Show({
      when: () => user.loading.value,
      children: () => _loadingTmpl(),
      fallback: () =>
        Show({
          when: () => user.data.value !== null,
          children: () => {
            const el = _userTmpl() as HTMLElement;
            bindText(el.querySelector('#name')!, () => user.data.value?.name || '');
            bindText(el.querySelector('#email')!, () => user.data.value?.email || '');
            return el;
          },
          fallback: () => _errorTmpl()
        })
    })
  );

  on(root.querySelector('#reload')!, 'click', () => refetch());

  return root;
}`
      }
    ]
  },
  {
    id: 'form-validation',
    title: 'Reactive Form with Validation and Touched Tracking',
    domain: 'forms',
    summary: 'Form management with validation schema, error association, and clean submission.',
    tags: ['createForm', 'Field', 'forms', 'validation'],
    files: [
      {
        filename: 'LoginForm.ts',
        language: 'typescript',
        code: `import { createForm } from '@samrey/forms';
import { template, on, bindText } from '@samrey/runtime';

const _tmpl = template(\`
<form ref="formEl" class="login-box">
  <div class="form-group" id="email-group"></div>
  <div class="form-group" id="pass-group"></div>
  <button type="submit" class="btn">Sign In</button>
  <p ref="status" class="status"></p>
</form>\`);

export function LoginForm() {
  const form = createForm({
    initialValues: { email: '', password: '' },
    validate: (values) => {
      const errors: Record<string, string> = {};
      if (!values.email.includes('@')) errors.email = 'Valid email is required.';
      if (values.password.length < 6) errors.password = 'Password must be at least 6 characters.';
      return errors;
    },
    onSubmit: async (values) => {
      console.log('Submitting credentials for', values.email);
    }
  });

  const root = _tmpl.clone();
  const { formEl, status } = root.refs;
  bindText(status, () => (form.isSubmitting.value ? 'Submitting...' : ''));
  on(formEl, 'submit', (e) => {
    e.preventDefault();
    void form.handleSubmit();
  });

  return root;
}`
      }
    ]
  },
  {
    id: 'component-testing',
    title: 'Component Unit Testing with @samrey/testing',
    domain: 'testing',
    summary: 'Testing component mounting, DOM queries, and user event triggering.',
    tags: ['testing', 'renderTest', 'fireEvent', 'flushReactivity', 'assertions'],
    files: [
      {
        filename: 'Counter.ts',
        language: 'typescript',
        code: `import { signal } from '@samrey/reactivity';
import { template, on, bindText } from '@samrey/runtime';

const _tmpl = template('<button ref="btn" type="button" class="btn">Count: <span ref="num"></span></button>');

export function Counter(props: { initial?: number }) {
  const count = signal(props.initial ?? 0);
  const root = _tmpl.clone();
  const { btn, num } = root.refs;

  bindText(num, () => count.value.toString());
  on(btn, 'click', () => count.update((n) => n + 1));

  return root;
}`
      },
      {
        filename: 'Counter.test.ts',
        language: 'typescript',
        code: `import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { renderTest, fireEvent, flushReactivity } from '@samrey/testing';
import { Counter } from './Counter.js';

describe('Counter Component', () => {
  it('renders initial count and increments on button click', async () => {
    const { container } = renderTest(() => Counter({ initial: 10 }));
    const button = container.querySelector('button')!;

    assert.ok(button.textContent?.includes('Count: 10'));

    fireEvent(button, 'click');
    await flushReactivity();

    assert.ok(button.textContent?.includes('Count: 11'));
  });
});`
      }
    ]
  },
  {
    id: 'ssr-streaming-server',
    title: 'Server-Side Rendering & Streaming with @samrey/ssr',
    domain: 'ssr',
    summary: 'Streaming SSR into Node.js HTTP response with Progressive Hydration markers.',
    tags: ['ssr', 'renderToString', 'renderToStream', 'hydration'],
    files: [
      {
        filename: 'src/App.ts',
        language: 'typescript',
        code: `import { template } from '@samrey/runtime';

const _appTmpl = template('<main><h1>Samrey SSR App</h1></main>');

export function App() {
  return _appTmpl();
}`
      },
      {
        filename: 'server.ts',
        language: 'typescript',
        code: `import http from 'node:http';
import { renderToString, renderToStream } from '@samrey/ssr';
import { App } from './src/App.js';

const server = http.createServer(async (req, res) => {
  if (req.url === '/') {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.write('<!DOCTYPE html><html><head><title>Samrey SSR</title></head><body><div id="app">');

    const appHtml = await renderToString(() => App());
    res.write(appHtml);

    res.write('</div><script type="module" src="/src/main.ts"></script></body></html>');
    res.end();
  }
});

server.listen(3000, () => {
  console.log('Samrey SSR server listening on http://localhost:3000');
});`
      }
    ]
  },
  {
    id: 'saas-dashboard',
    title: 'Complete SaaS Analytics Dashboard Mini-Application',
    domain: 'full-app',
    summary: 'Full composition: signals, computed metrics, For list, Show filters, and event actions.',
    tags: ['dashboard', 'saas', 'full-app', 'signals', 'computed', 'For', 'Show'],
    files: [
      {
        filename: 'Dashboard.ts',
        language: 'typescript',
        code: `import { signal, computed, batch } from '@samrey/reactivity';
import { template, For, Show, on, bindText } from '@samrey/runtime';

interface Metric {
  id: string;
  name: string;
  value: number;
  change: string;
}

const _dashTmpl = template(\`
<div class="dashboard p-6 font-sans">
  <header class="flex justify-between items-center mb-6">
    <h1 class="text-2xl font-bold">Analytics Overview</h1>
    <div class="actions space-x-2">
      <button type="button" id="refresh" class="px-3 py-1 bg-gray-200 rounded">Refresh</button>
      <button type="button" id="add-metric" class="px-3 py-1 bg-indigo-600 text-white rounded">Add Metric</button>
    </div>
  </header>
  <div class="summary text-lg font-semibold mb-4" id="total-val"></div>
  <div class="grid grid-cols-1 md:grid-cols-3 gap-4" id="metrics-grid"></div>
</div>\`);

const _cardTmpl = template(\`
<div class="metric-card p-4 border rounded shadow-sm bg-white">
  <div class="flex justify-between items-center">
    <span class="m-name font-medium text-gray-700"></span>
    <span class="m-change text-sm text-green-600"></span>
  </div>
  <div class="m-val text-3xl font-extrabold mt-2"></div>
</div>\`);

export function Dashboard() {
  const metrics = signal<Metric[]>([
    { id: '1', name: 'Active Users', value: 1420, change: '+12%' },
    { id: '2', name: 'Monthly Revenue', value: 89400, change: '+8.4%' },
    { id: '3', name: 'Conversion Rate', value: 3.8, change: '+0.5%' }
  ]);

  const totalSum = computed(() =>
    metrics.value.reduce((acc, m) => acc + m.value, 0)
  );

  const root = _dashTmpl() as HTMLElement;
  bindText(root.querySelector('#total-val')!, () =>
    \`Aggregated Sum: \${totalSum.value.toLocaleString()}\`
  );

  const grid = root.querySelector('#metrics-grid')!;
  grid.appendChild(
    For({
      each: () => metrics.value,
      key: (m) => m.id,
      children: (m) => {
        const card = _cardTmpl() as HTMLElement;
        bindText(card.querySelector('.m-name')!, () => m.name);
        bindText(card.querySelector('.m-change')!, () => m.change);
        bindText(card.querySelector('.m-val')!, () => m.value.toLocaleString());
        return card;
      }
    })
  );

  on(root.querySelector('#refresh')!, 'click', () => {
    batch(() => {
      metrics.value = metrics.value.map((m) => ({
        ...m,
        value: Math.round(m.value * (1 + (Math.random() * 0.1 - 0.05)))
      }));
    });
  });

  on(root.querySelector('#add-metric')!, 'click', () => {
    const id = String(Date.now());
    metrics.value = [
      ...metrics.value,
      { id, name: \`Custom KPI \${id.slice(-4)}\`, value: 500, change: '+0%' }
    ];
  });

  return root;
}`
      }
    ]
  },
  {
    id: 'switch-match-tabs',
    title: 'Multi-Branch Conditional Rendering with Switch & Match',
    domain: 'control-flow',
    summary: 'Demonstrates Switch and Match for tab navigation without re-rendering component trees.',
    tags: ['control-flow', 'switch', 'match', 'tabs'],
    files: [
      {
        filename: 'src/components/TabSelector.ts',
        language: 'typescript',
        code: `import { signal } from '@samrey/reactivity';
import { template, Switch, Match, on } from '@samrey/runtime';

const _navTmpl = template('<nav class="tab-nav"><button type="button" data-tab="home">Home</button><button type="button" data-tab="profile">Profile</button><button type="button" data-tab="settings">Settings</button><div class="content-slot"></div></nav>');

export function TabSelector() {
  const activeTab = signal<'home' | 'profile' | 'settings'>('home');
  const root = _navTmpl() as HTMLElement;

  on(root.querySelector('[data-tab="home"]')!, 'click', () => activeTab.set('home'));
  on(root.querySelector('[data-tab="profile"]')!, 'click', () => activeTab.set('profile'));
  on(root.querySelector('[data-tab="settings"]')!, 'click', () => activeTab.set('settings'));

  root.querySelector('.content-slot')!.appendChild(
    Switch({
      fallback: () => {
        const div = document.createElement('div');
        div.textContent = 'Tab not found';
        return div;
      },
      children: [
        Match({
          when: () => activeTab.value === 'home',
          children: () => {
            const el = document.createElement('section');
            el.textContent = 'Welcome to the Home Tab!';
            return el;
          }
        }),
        Match({
          when: () => activeTab.value === 'profile',
          children: () => {
            const el = document.createElement('section');
            el.textContent = 'User Profile Details';
            return el;
          }
        }),
        Match({
          when: () => activeTab.value === 'settings',
          children: () => {
            const el = document.createElement('section');
            el.textContent = 'Application Settings & Preferences';
            return el;
          }
        })
      ]
    })
  );

  return root;
}`
      }
    ]
  },
  {
    id: 'dynamic-component-loader',
    title: 'Dynamic Component Resolution with Dynamic Helper',
    domain: 'components',
    summary: 'Renders dynamic component functions reactively using the Dynamic helper.',
    tags: ['components', 'dynamic', 'runtime'],
    files: [
      {
        filename: 'src/components/DynamicView.ts',
        language: 'typescript',
        code: `import { signal } from '@samrey/reactivity';
import { Dynamic, bindDynamicChild, on } from '@samrey/runtime';

function GridView(props: { items: string[] }) {
  const ul = document.createElement('ul');
  ul.className = 'grid-view';
  props.items.forEach(i => {
    const li = document.createElement('li');
    li.textContent = i;
    ul.appendChild(li);
  });
  return ul;
}

function ListView(props: { items: string[] }) {
  const ol = document.createElement('ol');
  ol.className = 'list-view';
  props.items.forEach(i => {
    const li = document.createElement('li');
    li.textContent = i;
    ol.appendChild(li);
  });
  return ol;
}

export function DynamicViewContainer() {
  const currentView = signal<typeof GridView | typeof ListView>(GridView);
  const items = ['Alpha', 'Beta', 'Gamma', 'Delta'];

  const container = document.createElement('div');
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.textContent = 'Toggle View Type';
  on(btn, 'click', () => {
    currentView.set(currentView.value === GridView ? ListView : GridView);
  });

  const slot = document.createElement('div');
  bindDynamicChild(slot, () =>
    Dynamic({
      component: currentView.value,
      items
    })
  );

  container.appendChild(btn);
  container.appendChild(slot);

  return container;
}`
      }
    ]
  },
  {
    id: 'error-boundary-guard',
    title: 'Resilient UI with ErrorBoundary Component',
    domain: 'components',
    summary: 'Catches runtime exceptions in child components and displays custom fallback UI.',
    tags: ['components', 'error-boundary', 'resilience'],
    files: [
      {
        filename: 'src/components/SafeWidget.ts',
        language: 'typescript',
        code: `import { signal } from '@samrey/reactivity';
import { ErrorBoundary, on } from '@samrey/runtime';

function BuggyChild(props: { shouldThrow: () => boolean }) {
  const div = document.createElement('div');
  if (props.shouldThrow()) {
    throw new Error('Simulation of unexpected UI crash');
  }
  div.textContent = 'Child rendered safely!';
  return div;
}

export function SafeWidget() {
  const triggerCrash = signal(false);
  const container = document.createElement('div');

  const btn = document.createElement('button');
  btn.textContent = 'Trigger Crash';
  on(btn, 'click', () => triggerCrash.set(true));
  container.appendChild(btn);

  container.appendChild(
    ErrorBoundary({
      fallback: (err, reset) => {
        const alert = document.createElement('div');
        alert.className = 'error-alert';
        const errMsg = document.createElement('p');
        errMsg.textContent = 'Error caught: ' + err.message;
        const retryBtn = document.createElement('button');
        retryBtn.className = 'retry';
        retryBtn.textContent = 'Retry';
        alert.replaceChildren(errMsg, retryBtn);
        on(alert.querySelector('.retry')!, 'click', () => {
          triggerCrash.set(false);
          reset();
        });
        return alert;
      },
      children: () => BuggyChild({ shouldThrow: () => triggerCrash.value })
    })
  );

  return container;
}`
      }
    ]
  },
  {
    id: 'suspense-async-boundary',
    title: 'Async Data Fetching with Suspense Boundary',
    domain: 'components',
    summary: 'Displays loading fallbacks while async resources resolve.',
    tags: ['components', 'suspense', 'async', 'resources'],
    files: [
      {
        filename: 'src/components/SuspendedUser.ts',
        language: 'typescript',
        code: `import { createResource } from '@samrey/http';
import { Suspense, template, bindText } from '@samrey/runtime';

const _tmpl = template('<div class="user-card"><h2 class="name"></h2></div>');

export function SuspendedUser(props: { userId: number }) {
  const user = createResource(async () => {
    const res = await fetch('https://api.example.com/users/' + props.userId);
    return res.json();
  });

  return Suspense({
    fallback: () => {
      const loader = document.createElement('div');
      loader.className = 'spinner';
      loader.textContent = 'Loading user profile...';
      return loader;
    },
    children: () => {
      const root = _tmpl() as HTMLElement;
      bindText(root.querySelector('.name')!, () => user.data.value?.name || '');
      return root;
    }
  });
}`
      }
    ]
  },
  {
    id: 'lifecycle-cleanup-timer',
    title: 'Component Lifecycle and Teardown with onMount & onCleanup',
    domain: 'components',
    summary: 'Registers lifecycle hooks to manage subscriptions, DOM intervals, and event cleanups.',
    tags: ['components', 'lifecycle', 'onMount', 'onCleanup'],
    files: [
      {
        filename: 'src/components/Clock.ts',
        language: 'typescript',
        code: `import { signal } from '@samrey/reactivity';
import { onMount, onCleanup, template, bindText } from '@samrey/runtime';

const _tmpl = template('<div class="live-clock">Time: <span class="time-text"></span></div>');

export function LiveClock() {
  const time = signal(new Date().toLocaleTimeString());
  const root = _tmpl() as HTMLElement;
  bindText(root.querySelector('.time-text')!, () => time.value);

  onMount(() => {
    const interval = setInterval(() => {
      time.set(new Date().toLocaleTimeString());
    }, 1000);

    onCleanup(() => {
      clearInterval(interval);
    });
  });

  return root;
}`
      }
    ]
  },
  {
    id: 'context-theme-provider',
    title: 'Dependency Injection with Context API',
    domain: 'reactivity',
    summary: 'Shares state across nested component trees without prop-drilling using createContext.',
    tags: ['reactivity', 'context', 'createContext', 'useContext'],
    files: [
      {
        filename: 'src/context/ThemeContext.ts',
        language: 'typescript',
        code: `import { signal, createContext, useContext, type Signal } from '@samrey/reactivity';
import { template, bindAttr, on } from '@samrey/runtime';

export interface ThemeContextValue {
  theme: Signal<'light' | 'dark'>;
  toggle: () => void;
}

export const ThemeContext = createContext<ThemeContextValue>();

export function ThemeConsumer() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('ThemeConsumer must be inside ThemeProvider');

  const btn = document.createElement('button');
  bindAttr(btn, 'class', () => 'btn theme-' + ctx.theme.value);
  btn.textContent = 'Toggle Theme';
  on(btn, 'click', ctx.toggle);
  return btn;
}`
      }
    ]
  },
  {
    id: 'batch-untrack-mutation',
    title: 'Batch Updates and Untracked Reads',
    domain: 'reactivity',
    summary: 'Atomically updates multiple signals without triggering intermediate derivations.',
    tags: ['reactivity', 'batch', 'untrack'],
    files: [
      {
        filename: 'src/lib/batchDemo.ts',
        language: 'typescript',
        code: `import { signal, computed, batch, untrack, effect } from '@samrey/reactivity';

export function runBatchDemo() {
  const firstName = signal('Ada');
  const lastName = signal('Lovelace');
  const runs = signal(0);

  effect(() => {
    const first = firstName.value;
    const last = untrack(() => lastName.value);
    runs.set((n) => n + 1);
  });

  batch(() => {
    firstName.set('Grace');
    lastName.set('Hopper');
  });

  return { firstName, lastName, runs };
}`
      }
    ]
  },
  {
    id: 'produce-nested-store',
    title: 'Deep Reactive Store Mutation with produce()',
    domain: 'reactivity',
    summary: 'Applies draft-based immutable mutations to fine-grained stores without rebuilding trees.',
    tags: ['reactivity', 'createStore', 'produce', 'stores'],
    files: [
      {
        filename: 'src/stores/editorStore.ts',
        language: 'typescript',
        code: `import { createStore, produce } from '@samrey/reactivity';

export interface EditorState {
  doc: { title: string; content: string; tags: string[] };
  cursor: { line: number; col: number };
}

export function createEditorStore() {
  const state = createStore<EditorState>({
    doc: { title: 'Untitled', content: '', tags: [] },
    cursor: { line: 1, col: 1 }
  });

  const addTag = (tag: string) => {
    produce(state, (draft) => {
      draft.doc.tags.push(tag);
      draft.cursor.col += 1;
    });
  };

  return { state, addTag };
}`
      }
    ]
  },
  {
    id: 'svg-interactive-chart',
    title: 'Reactive SVG Elements and Coordinate Binding',
    domain: 'components',
    summary: 'Binds dynamic signal coordinates to SVG circle and path elements using svg helper.',
    tags: ['components', 'svg', 'runtime'],
    files: [
      {
        filename: 'src/components/SvgChart.ts',
        language: 'typescript',
        code: `import { signal } from '@samrey/reactivity';
import { svg, bindAttr, on } from '@samrey/runtime';

export function SvgChart() {
  const cx = signal(50);
  const cy = signal(50);

  const container = document.createElement('div');
  const svgEl = svg('<svg width="200" height="200" viewBox="0 0 200 200"><circle r="20" fill="teal" /></svg>') as SVGSVGElement;
  const circle = svgEl.querySelector('circle')!;

  bindAttr(circle, 'cx', () => String(cx.value));
  bindAttr(circle, 'cy', () => String(cy.value));

  on(svgEl, 'mousemove', (e: MouseEvent) => {
    const rect = svgEl.getBoundingClientRect();
    cx.set(e.clientX - rect.left);
    cy.set(e.clientY - rect.top);
  });

  container.appendChild(svgEl);
  return container;
}`
      }
    ]
  },
  {
    id: 'portal-modal-dialog',
    title: 'Modal Rendering Outside Parent Hierarchy with Portal',
    domain: 'components',
    summary: 'Renders overlays directly into document.body or custom target while maintaining reactive scope.',
    tags: ['components', 'portal', 'modal'],
    files: [
      {
        filename: 'src/components/Modal.ts',
        language: 'typescript',
        code: `import { signal } from '@samrey/reactivity';
import { Portal, Show, template, on } from '@samrey/runtime';

const _modalTmpl = template('<div class="modal-backdrop"><div class="modal-dialog"><h3>Modal Header</h3><button type="button" class="close-btn">Close</button></div></div>');

export function ModalDemo() {
  const isOpen = signal(false);
  const container = document.createElement('div');
  const openBtn = document.createElement('button');
  openBtn.type = 'button';
  openBtn.textContent = 'Open Portal Modal';
  on(openBtn, 'click', () => isOpen.set(true));

  container.appendChild(openBtn);
  container.appendChild(
    Portal({
      mount: document.body,
      children: () =>
        Show({
          when: () => isOpen.value,
          children: () => {
            const modal = _modalTmpl() as HTMLElement;
            on(modal.querySelector('.close-btn')!, 'click', () => isOpen.set(false));
            return modal;
          }
        })
    })
  );

  return container;
}`
      }
    ]
  },
  {
    id: 'route-params-and-queries',
    title: 'Dynamic Routing with URL Parameters and Query Strings',
    domain: 'routing',
    summary: 'Reads dynamic route parameters and search queries with useParams and useSearchParams.',
    tags: ['routing', 'useParams', 'useSearchParams'],
    files: [
      {
        filename: 'src/routes/ProductView.ts',
        language: 'typescript',
        code: `import { useParams, useSearchParams } from '@samrey/router';
import { template, bindText } from '@samrey/runtime';

const _tmpl = template('<div class="product-page"><h2>Product ID: <span class="pid"></span></h2><p>Tab: <span class="tab"></span></p></div>');

export function ProductView() {
  const params = useParams();
  const [searchParams] = useSearchParams();
  const root = _tmpl() as HTMLElement;

  bindText(root.querySelector('.pid')!, () => params.value.id || 'None');
  bindText(root.querySelector('.tab')!, () => searchParams.value.get('tab') || 'overview');

  return root;
}`
      }
    ]
  },
  {
    id: 'http-cached-client',
    title: 'HTTP Requests with Memory Caching and Invalidation',
    domain: 'http',
    summary: 'Configures HTTP client with in-memory TTL caching and cache invalidation.',
    tags: ['http', 'httpClient', 'createHttpCache'],
    files: [
      {
        filename: 'src/api/client.ts',
        language: 'typescript',
        code: `import { createHttpClient, createHttpCache } from '@samrey/http';

export function setupApiClient() {
  const cache = createHttpCache({ defaultTtl: 60000, maxEntries: 50 });
  const client = createHttpClient('https://api.example.com');

  return {
    getArticles: () =>
      cache.dedupe('articles', () =>
        client.get('/articles', { headers: { Accept: 'application/json' } })
      ),
    invalidate: () => cache.clear()
  };
}`
      }
    ]
  },
  {
    id: 'accessible-form-fields',
    title: 'Accessible Form Field Bindings with Schema Validation',
    domain: 'forms',
    summary: 'Generates ARIA attributes, validation states, and accessible errors using getAccessibleFieldProps.',
    tags: ['forms', 'accessibility', 'a11y', 'schema'],
    files: [
      {
        filename: 'src/forms/ContactForm.ts',
        language: 'typescript',
        code: `import { createForm, getAccessibleFieldProps } from '@samrey/forms';
import { bindAttr, bindText } from '@samrey/runtime';

export function AccessibleContactForm() {
  const form = createForm({
    initialValues: { email: '', message: '' },
    validate: (values) => {
      const errors: Record<string, string> = {};
      if (!values.email.includes('@')) errors.email = 'Valid email is required.';
      if (values.message.length < 5) errors.message = 'Message must be at least 5 characters.';
      return errors;
    },
    onSubmit: async () => {}
  });

  const formEl = document.createElement('form');
  const emailInput = document.createElement('input');
  emailInput.id = 'contact-email';
  const emailError = document.createElement('span');
  emailError.id = 'email-error';

  bindAttr(emailInput, 'aria-invalid', () =>
    String(Boolean(getAccessibleFieldProps(form.fields.email)['aria-invalid']))
  );
  bindAttr(emailInput, 'aria-describedby', () =>
    getAccessibleFieldProps(form.fields.email)['aria-describedby'] ?? ''
  );
  bindText(emailError, () => form.fields.email.error.value || '');

  formEl.appendChild(emailInput);
  formEl.appendChild(emailError);
  return formEl;
}`
      }
    ]
  },
  {
    id: 'ssr-hydration-pipeline',
    title: 'Full SSR Pipeline: Server Render and Client Hydration',
    domain: 'ssr',
    summary: 'Renders components to HTML string on server and hydrates seamlessly on the client.',
    tags: ['ssr', 'renderToString', 'hydrate', 'serialization'],
    files: [
      {
        filename: 'src/ssr/pipeline.ts',
        language: 'typescript',
        code: `import { renderToString, serializeStateForHydration } from '@samrey/ssr';
import { hydrate } from '@samrey/runtime';
import { signal } from '@samrey/reactivity';

export async function serverRender(App: () => HTMLElement) {
  const state = { user: 'Alice', theme: 'dark' };
  const html = await renderToString(App);
  const serialized = serializeStateForHydration(state);
  return '<!DOCTYPE html><html><body><div id="app">' + html + '</div><script id="__SAMREY_STATE__" type="application/json">' + serialized + '</script></body></html>';
}

export function clientHydrate(App: () => HTMLElement) {
  const container = document.getElementById('app')!;
  return hydrate(App, container);
}`
      }
    ]
  },
  {
    id: 'fire-event-component-test',
    title: 'Unit Testing Components with fireEvent and waitFor',
    domain: 'testing',
    summary: 'Tests user interactions, state mutations, and async updates with @samrey/testing.',
    tags: ['testing', 'fireEvent', 'waitFor', 'renderTestComponent'],
    files: [
      {
        filename: 'tests/counter.test.ts',
        language: 'typescript',
        code: `import { renderTestComponent, fireEvent, waitFor, cleanupAllTestContainers } from '@samrey/testing';
import { signal } from '@samrey/reactivity';
import { on, bindText, template } from '@samrey/runtime';

const _tmpl = template('<div><span class="count"></span><button type="button" class="inc">+</button></div>');

function Counter() {
  const c = signal(0);
  const root = _tmpl() as HTMLElement;
  bindText(root.querySelector('.count')!, () => String(c.value));
  on(root.querySelector('.inc')!, 'click', () => c.update((n) => n + 1));
  return root;
}

export async function testCounter() {
  const { container } = renderTestComponent(Counter);
  const btn = container.querySelector('.inc')!;
  const countSpan = container.querySelector('.count')!;

  fireEvent(btn, 'click');
  await waitFor(() => countSpan.textContent === '1');

  cleanupAllTestContainers();
}`
      }
    ]
  }
];

export function getExamples(domain?: string): SamreyCodeExample[] {
  if (!domain) return SAMREY_EXAMPLES;
  const lower = domain.toLowerCase().trim();
  return SAMREY_EXAMPLES.filter(
    (e) => e.domain.toLowerCase() === lower || e.tags.some((t) => t.toLowerCase() === lower)
  );
}

export function getExampleById(id: string): SamreyCodeExample | undefined {
  return SAMREY_EXAMPLES.find((e) => e.id.toLowerCase() === id.toLowerCase());
}

export function getExamplesByQuery(query: string): SamreyCodeExample[] {
  if (!query) return SAMREY_EXAMPLES;
  const lower = query.toLowerCase().trim();
  return SAMREY_EXAMPLES.filter(
    (e) =>
      e.id.toLowerCase().includes(lower) ||
      e.title.toLowerCase().includes(lower) ||
      e.domain.toLowerCase().includes(lower) ||
      e.tags.some((t) => t.toLowerCase().includes(lower)) ||
      e.summary.toLowerCase().includes(lower)
  );
}


