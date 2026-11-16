/**
 * @license Apache-2.0
 * @samrey/monorepo - Multi-Model Benchmark 20 Official Challenges
 */

import { ChallengeTask } from '../adapters/base-adapter.js';

export const BENCHMARK_CHALLENGES: ChallengeTask[] = [
  // 1. Basic application creation
  {
    id: 1,
    category: 'Basic Application Creation',
    name: 'App Bootstrap & Layout',
    prompt: 'Create the root App shell component for Samrey. It should render a header with an h1 title, a main content container with an initial greeting text, and a footer with copyright text. Use static template hoisting and export App.',
    expectedFiles: ['App.ts'],
    referenceCode: {
      'App.ts': `import { template } from '@samrey/runtime';
const _tmpl = template('<div class="app-shell"><header><h1>Samrey App</h1></header><main><p>Welcome to Samrey</p></main><footer><p>© 2026</p></footer></div>');
export function App() { return _tmpl(); }`
    },
    testCode: `import assert from 'node:assert/strict';
import { renderTest } from '@samrey/testing';
import { App } from './App.js';
const { container } = renderTest(() => App());
assert.ok(container.querySelector('h1')?.textContent?.includes('Samrey'));
assert.ok(container.querySelector('main')?.textContent?.includes('Welcome'));`
  },

  // 2. Component creation
  {
    id: 2,
    category: 'Component Creation',
    name: 'User Card Component with Refs',
    prompt: 'Create an idiomatic UserCard component taking props { name: string; role: string; avatarUrl: string }. Use a hoisted static template with template references (ref="title", ref="role", ref="img") and surgical bindings.',
    expectedFiles: ['UserCard.ts'],
    referenceCode: {
      'UserCard.ts': `import { template, bindText, bindAttr } from '@samrey/runtime';
export interface UserCardProps { name: string; role: string; avatarUrl: string; }
const _tmpl = template('<div class="user-card"><img ref="img" alt="avatar" /><h3 ref="title"></h3><p ref="role"></p></div>');
export function UserCard(props: UserCardProps) {
  const root = _tmpl.clone();
  const { img, title, role } = root.refs;
  bindAttr(img, 'src', () => props.avatarUrl);
  bindText(title, () => props.name);
  bindText(role, () => props.role);
  return root;
}`
    },
    testCode: `import assert from 'node:assert/strict';
import { renderTest } from '@samrey/testing';
import { UserCard } from './UserCard.js';
const { container } = renderTest(() => UserCard({ name: 'Ada Lovelace', role: 'Engineer', avatarUrl: 'avatar.png' }));
assert.equal(container.querySelector('h3')?.textContent, 'Ada Lovelace');
assert.equal(container.querySelector('p')?.textContent, 'Engineer');`
  },

  // 3. Fine-grained state management
  {
    id: 3,
    category: 'Fine-Grained State Management',
    name: 'Interactive Counter with Signals',
    prompt: 'Build a Counter component using a signal from @samrey/reactivity. It must have increment (+) and decrement (-) buttons and display the current count in a span with ref="count".',
    expectedFiles: ['Counter.ts'],
    referenceCode: {
      'Counter.ts': `import { signal } from '@samrey/reactivity';
import { template, bindText, on } from '@samrey/runtime';
const _tmpl = template('<div class="counter"><button ref="dec">-</button><span ref="count"></span><button ref="inc">+</button></div>');
export function Counter(props: { initial?: number } = {}) {
  const count = signal(props.initial ?? 0);
  const root = _tmpl.clone();
  const { dec, count: countEl, inc } = root.refs;
  bindText(countEl, () => count.value.toString());
  on(inc, 'click', () => count.update(n => n + 1));
  on(dec, 'click', () => count.update(n => n - 1));
  return root;
}`
    },
    testCode: `import assert from 'node:assert/strict';
import { renderTest, fireEvent, flushReactivity } from '@samrey/testing';
import { Counter } from './Counter.js';
const { container } = renderTest(() => Counter({ initial: 5 }));
assert.equal(container.querySelector('span')?.textContent, '5');
fireEvent(container.querySelectorAll('button')[1], 'click');
await flushReactivity();
assert.equal(container.querySelector('span')?.textContent, '6');`
  },

  // 4. Derived reactive state
  {
    id: 4,
    category: 'Derived Reactive State',
    name: 'Cart Total Calculator with Computed',
    prompt: 'Implement a ShoppingSummary component that manages a signal of item prices and uses computed() to calculate subtotal, 10% tax, and grand total. Display all three in separate spans.',
    expectedFiles: ['ShoppingSummary.ts'],
    referenceCode: {
      'ShoppingSummary.ts': `import { signal, computed } from '@samrey/reactivity';
import { template, bindText } from '@samrey/runtime';
const _tmpl = template('<div class="summary">Subtotal: <span ref="sub"></span>, Tax: <span ref="tax"></span>, Total: <span ref="tot"></span></div>');
export function ShoppingSummary(props: { prices?: number[] } = {}) {
  const prices = signal(props.prices ?? [20, 30, 50]);
  const subtotal = computed(() => prices.value.reduce((a, b) => a + b, 0));
  const tax = computed(() => subtotal.value * 0.10);
  const total = computed(() => subtotal.value + tax.value);
  const root = _tmpl.clone();
  const { sub, tax: taxEl, tot } = root.refs;
  bindText(sub, () => subtotal.value.toFixed(2));
  bindText(taxEl, () => tax.value.toFixed(2));
  bindText(tot, () => total.value.toFixed(2));
  return root;
}`
    },
    testCode: `import assert from 'node:assert/strict';
import { renderTest } from '@samrey/testing';
import { ShoppingSummary } from './ShoppingSummary.js';
const { container } = renderTest(() => ShoppingSummary({ prices: [100] }));
assert.equal(container.querySelectorAll('span')[0].textContent, '100.00');
assert.equal(container.querySelectorAll('span')[1].textContent, '10.00');
assert.equal(container.querySelectorAll('span')[2].textContent, '110.00');`
  },

  // 5. Complex component composition
  {
    id: 5,
    category: 'Complex Component Composition',
    name: 'Master-Detail View with Show and For',
    prompt: 'Build a ContactList component that renders a list of contacts with For() and a detail pane using Show(). Clicking a contact row selects it and displays their detail card.',
    expectedFiles: ['ContactList.ts'],
    referenceCode: {
      'ContactList.ts': `import { signal } from '@samrey/reactivity';
import { template, bindText, on, For, Show } from '@samrey/runtime';
export interface Contact { id: number; name: string; email: string; }
const _layoutTmpl = template('<div class="contacts-layout"><ul ref="list" class="list"></ul><div ref="detail" class="detail"></div></div>');
const _rowTmpl = template('<li class="contact-row"><button ref="btn"></button></li>');
const _cardTmpl = template('<div class="card"><h4 ref="name"></h4><p ref="email"></p></div>');
export function ContactList(props: { contacts: Contact[] }) {
  const selected = signal<Contact | null>(null);
  const root = _layoutTmpl.clone();
  const { list, detail } = root.refs;
  list.appendChild(For({
    each: () => props.contacts,
    key: (c) => c.id,
    children: (c) => {
      const row = _rowTmpl.clone();
      bindText(row.refs.btn, () => c.name);
      on(row.refs.btn, 'click', () => { selected.value = c; });
      return row;
    }
  }));
  detail.appendChild(Show({
    when: () => selected.value,
    children: () => {
      const card = _cardTmpl.clone();
      bindText(card.refs.name, () => selected.value?.name ?? '');
      bindText(card.refs.email, () => selected.value?.email ?? '');
      return card;
    },
    fallback: () => template('<p>Select a contact</p>')()
  }));
  return root;
}`
    },
    testCode: `import assert from 'node:assert/strict';
import { renderTest, fireEvent, flushReactivity } from '@samrey/testing';
import { ContactList } from './ContactList.js';
const contacts = [{ id: 1, name: 'Alice', email: 'alice@example.com' }];
const { container } = renderTest(() => ContactList({ contacts }));
assert.ok(container.textContent?.includes('Select a contact'));
fireEvent(container.querySelector('button')!, 'click');
await flushReactivity();
assert.ok(container.querySelector('h4')?.textContent?.includes('Alice'));`
  },

  // 6. Forms and validation
  {
    id: 6,
    category: 'Forms and Validation',
    name: 'Accessible Registration Form',
    prompt: 'Implement a RegistrationForm using createForm from @samrey/forms. Require username and email. Display field error messages and handle submission.',
    expectedFiles: ['RegistrationForm.ts'],
    referenceCode: {
      'RegistrationForm.ts': `import { createForm, bindField } from '@samrey/forms';
import { template, bindText, on } from '@samrey/runtime';
const _tmpl = template('<form novalidate><input id="uname" ref="u" /><span ref="uErr"></span><input id="email" ref="e" /><span ref="eErr"></span><button ref="sub" type="submit">Submit</button></form>');
export function RegistrationForm(props: { onSubmit: (data: any) => Promise<void> }) {
  const form = createForm({
    initialValues: { username: '', email: '' },
    validate: (v) => {
      const errs: Record<string, string> = {};
      if (!v.username.trim()) errs.username = 'Username required';
      if (!v.email.includes('@')) errs.email = 'Valid email required';
      return errs;
    },
    onSubmit: props.onSubmit
  });
  const root = _tmpl.clone();
  const { u, uErr, e, eErr } = root.refs;
  bindField(u as HTMLInputElement, form, 'username');
  bindField(e as HTMLInputElement, form, 'email');
  bindText(uErr, () => form.errors.value.username ?? '');
  bindText(eErr, () => form.errors.value.email ?? '');
  on(root, 'submit', (ev) => { ev.preventDefault(); form.handleSubmit(); });
  return root;
}`
    },
    testCode: `import assert from 'node:assert/strict';
import { renderTest, fireEvent, flushReactivity } from '@samrey/testing';
import { RegistrationForm } from './RegistrationForm.js';
let submitted = false;
const { container } = renderTest(() => RegistrationForm({ onSubmit: async () => { submitted = true; } }));
fireEvent(container.querySelector('form')!, 'submit');
await flushReactivity();
assert.equal(submitted, false);
assert.ok(container.textContent?.includes('Username required'));`
  },

  // 7. Routing
  {
    id: 7,
    category: 'Routing',
    name: 'Client Navigation with RouterOutlet and Links',
    prompt: 'Configure a client-side router with createRouter from @samrey/router. Set up routes for "/" (HomeView) and "/dashboard" (DashboardView), and a layout component with Link elements and RouterOutlet.',
    expectedFiles: ['AppRouter.ts'],
    referenceCode: {
      'AppRouter.ts': `import { createRouter, RouterOutlet, Link } from '@samrey/router';
import { template } from '@samrey/runtime';
export const HomeView = () => template('<div>Home</div>')();
export const DashboardView = () => template('<div>Dashboard</div>')();
export const router = createRouter([
  { path: '/', component: HomeView },
  { path: '/dashboard', component: DashboardView }
]);
const _layout = template('<div class="nav-layout"><nav ref="nav"></nav><main ref="main"></main></div>');
export function Layout() {
  const root = _layout.clone();
  root.refs.nav.appendChild(Link({ href: '/', children: 'Home' }));
  root.refs.nav.appendChild(Link({ href: '/dashboard', children: 'Dashboard' }));
  root.refs.main.appendChild(RouterOutlet());
  return root;
}`
    },
    testCode: `import assert from 'node:assert/strict';
import { renderTest } from '@samrey/testing';
import { Layout } from './AppRouter.js';
const { container } = renderTest(() => Layout());
assert.ok(container.querySelector('a'));
assert.ok(container.querySelector('main'));`
  },

  // 8. Data fetching
  {
    id: 8,
    category: 'Data Fetching',
    name: 'Async Resource Loader with createResource',
    prompt: 'Implement a UserProfileLoader component that fetches user data using createResource from @samrey/http, rendering a loading indicator with Show while pending, and displaying the loaded username.',
    expectedFiles: ['UserProfileLoader.ts'],
    referenceCode: {
      'UserProfileLoader.ts': `import { createResource } from '@samrey/http';
import { template, Show, bindText } from '@samrey/runtime';
export function UserProfileLoader(props: { fetchUser: () => Promise<{ name: string }> }) {
  const [data] = createResource(props.fetchUser);
  const _card = template('<div class="profile-card"><h2 ref="name"></h2></div>');
  return Show({
    when: () => data.loading.value,
    children: () => template('<div class="loading">Loading...</div>')(),
    fallback: () => {
      const root = _card.clone();
      bindText(root.refs.name, () => data.value?.name ?? '');
      return root;
    }
  });
}`
    },
    testCode: `import assert from 'node:assert/strict';
import { renderTest, flushReactivity } from '@samrey/testing';
import { UserProfileLoader } from './UserProfileLoader.js';
const { container } = renderTest(() => UserProfileLoader({ fetchUser: async () => ({ name: 'Margaret Hamilton' }) }));
assert.ok(container.textContent?.includes('Loading'));
await new Promise(r => setTimeout(r, 20));
await flushReactivity();
assert.ok(container.textContent?.includes('Margaret Hamilton'));`
  },

  // 9. Authentication integration
  {
    id: 9,
    category: 'Authentication Integration',
    name: 'Auth Session Guard & State',
    prompt: 'Build an AuthManager service and AuthStatusWidget component. The manager stores currentUser and isAuthenticated signals with login() and logout() methods. The widget toggles Login / Logout buttons with Show.',
    expectedFiles: ['AuthManager.ts'],
    referenceCode: {
      'AuthManager.ts': `import { signal } from '@samrey/reactivity';
import { template, bindText, on, Show } from '@samrey/runtime';
export function createAuthManager() {
  const user = signal<string | null>(null);
  return {
    user,
    login: (name: string) => { user.value = name; },
    logout: () => { user.value = null; }
  };
}
const _tmpl = template('<div class="auth-bar"><div ref="pane"></div></div>');
export function AuthStatusWidget(props: { auth: ReturnType<typeof createAuthManager> }) {
  const root = _tmpl.clone();
  root.refs.pane.appendChild(Show({
    when: () => props.auth.user.value,
    children: () => {
      const loggedIn = template('<div><span>User: </span><span ref="u"></span><button ref="btn">Logout</button></div>').clone();
      bindText(loggedIn.refs.u, () => props.auth.user.value ?? '');
      on(loggedIn.refs.btn, 'click', () => props.auth.logout());
      return loggedIn;
    },
    fallback: () => {
      const guest = template('<div><button ref="btn">Login</button></div>').clone();
      on(guest.refs.btn, 'click', () => props.auth.login('User1'));
      return guest;
    }
  }));
  return root;
}`
    },
    testCode: `import assert from 'node:assert/strict';
import { renderTest, fireEvent, flushReactivity } from '@samrey/testing';
import { createAuthManager, AuthStatusWidget } from './AuthManager.js';
const auth = createAuthManager();
const { container } = renderTest(() => AuthStatusWidget({ auth }));
assert.ok(container.textContent?.includes('Login'));
fireEvent(container.querySelector('button')!, 'click');
await flushReactivity();
assert.ok(container.textContent?.includes('User1'));`
  },

  // 10. Authorization
  {
    id: 10,
    category: 'Authorization',
    name: 'Role-Based Access Control Directive',
    prompt: 'Implement an Authorize component taking props { role: string; userRoles: string[]; children: () => Node; fallback?: () => Node }. It checks whether userRoles includes role, rendering children or fallback.',
    expectedFiles: ['Authorize.ts'],
    referenceCode: {
      'Authorize.ts': `import { Show, template } from '@samrey/runtime';
export function Authorize(props: { role: string; userRoles: string[]; children: () => any; fallback?: () => any }) {
  const hasRole = () => props.userRoles.includes(props.role);
  return Show({
    when: hasRole,
    children: props.children,
    fallback: props.fallback ?? (() => template('<div class="denied">Access Denied</div>')())
  });
}`
    },
    testCode: `import assert from 'node:assert/strict';
import { renderTest } from '@samrey/testing';
import { template } from '@samrey/runtime';
import { Authorize } from './Authorize.js';
const { container } = renderTest(() => Authorize({
  role: 'admin',
  userRoles: ['viewer'],
  children: () => template('<div>Admin Area</div>')()
}));
assert.ok(container.textContent?.includes('Access Denied'));`
  },

  // 11. SSR
  {
    id: 11,
    category: 'SSR',
    name: 'Streaming Server-Side Renderer',
    prompt: 'Implement an SSR render handler using renderToString from @samrey/ssr. Take a component factory, render to HTML string, wrap in an HTML document layout with charset and title, and return the string.',
    expectedFiles: ['ServerRenderer.ts'],
    referenceCode: {
      'ServerRenderer.ts': `import { renderToString } from '@samrey/ssr';
export async function handleSsrRequest(componentFactory: () => any, title = 'Samrey SSR'): Promise<string> {
  const bodyHtml = await renderToString(componentFactory);
  return \`<!DOCTYPE html><html><head><meta charset="utf-8" /><title>\${title}</title></head><body><div id="app">\${bodyHtml}</div></body></html>\`;
}`
    },
    testCode: `import assert from 'node:assert/strict';
import { template } from '@samrey/runtime';
import { handleSsrRequest } from './ServerRenderer.js';
const html = await handleSsrRequest(() => template('<h1>Hello SSR</h1>')(), 'Test Page');
assert.ok(html.includes('Hello SSR'));
assert.ok(html.includes('<title>Test Page</title>'));`
  },

  // 12. Hydration
  {
    id: 12,
    category: 'Hydration',
    name: 'Client Hydration Bootstrapper',
    prompt: 'Write client bootstrap code that hydrates the server-rendered markup inside document.getElementById("app") using hydrate from @samrey/ssr, attaching signal bindings to existing elements.',
    expectedFiles: ['ClientHydration.ts'],
    referenceCode: {
      'ClientHydration.ts': `import { hydrate } from '@samrey/ssr';
export function bootstrapClient(appFactory: () => any, container: HTMLElement): void {
  hydrate(appFactory, container);
}`
    },
    testCode: `import assert from 'node:assert/strict';
import { template } from '@samrey/runtime';
import { bootstrapClient } from './ClientHydration.js';
const el = document.createElement('div');
el.innerHTML = '<button>Hydrated</button>';
bootstrapClient(() => template('<button>Hydrated</button>')(), el);
assert.equal(el.querySelector('button')?.textContent, 'Hydrated');`
  },

  // 13. Error handling
  {
    id: 13,
    category: 'Error Handling',
    name: 'ErrorBoundary Safe Fallback',
    prompt: 'Build an application view wrapped in ErrorBoundary from @samrey/runtime that catches child exceptions and displays a custom fallback message with a reset button.',
    expectedFiles: ['SafeView.ts'],
    referenceCode: {
      'SafeView.ts': `import { ErrorBoundary, template, on } from '@samrey/runtime';
export function SafeView(props: { riskyComponent: () => any }) {
  const _fallbackTmpl = template('<div class="error-pane"><h3>An error occurred</h3><button ref="btn">Try Again</button></div>');
  return ErrorBoundary({
    fallback: (_err, reset) => {
      const root = _fallbackTmpl.clone();
      on(root.refs.btn, 'click', reset);
      return root;
    },
    children: props.riskyComponent
  });
}`
    },
    testCode: `import assert from 'node:assert/strict';
import { renderTest } from '@samrey/testing';
import { SafeView } from './SafeView.js';
const { container } = renderTest(() => SafeView({
  riskyComponent: () => { throw new Error('Boom'); }
}));
assert.ok(container.textContent?.includes('An error occurred'));`
  },

  // 14. Debugging
  {
    id: 14,
    category: 'Debugging',
    name: 'Diagnostic Parser & Repair',
    prompt: 'Implement a diagnoseCodeIssue function that inspects error messages for SAMREY-108 or foreign React hook violations and returns corrective recommendations.',
    expectedFiles: ['CodeDiagnostics.ts'],
    referenceCode: {
      'CodeDiagnostics.ts': `export function diagnoseCodeIssue(errorMessage: string): { code: string; suggestion: string } {
  if (errorMessage.includes('SAMREY-108') || errorMessage.includes('<Show') || errorMessage.includes('<For')) {
    return { code: 'SAMREY-108', suggestion: 'Invoke Show/For as TypeScript component functions: Show({ when, children })' };
  }
  if (errorMessage.includes('useState') || errorMessage.includes('useEffect')) {
    return { code: 'FOREIGN-HOOK', suggestion: 'Replace foreign React hooks with signal() and effect() from @samrey/reactivity' };
  }
  return { code: 'UNKNOWN', suggestion: 'Inspect Samrey documentation' };
}`
    },
    testCode: `import assert from 'node:assert/strict';
import { diagnoseCodeIssue } from './CodeDiagnostics.js';
const diag = diagnoseCodeIssue('[SAMREY-108] Unsupported template-level control flow tag');
assert.equal(diag.code, 'SAMREY-108');
assert.ok(diag.suggestion.includes('Show'));`
  },

  // 15. Performance optimization
  {
    id: 15,
    category: 'Performance Optimization',
    name: 'Batched High-Frequency State Mutations',
    prompt: 'Implement a HighFrequencyUpdater that takes updates to x, y, and z coordinates and uses batch from @samrey/reactivity so downstream effects fire only once per update cycle.',
    expectedFiles: ['HighFrequencyUpdater.ts'],
    referenceCode: {
      'HighFrequencyUpdater.ts': `import { signal, batch, effect } from '@samrey/reactivity';
export function createHighFrequencyUpdater() {
  const x = signal(0);
  const y = signal(0);
  const z = signal(0);
  let effectFiredCount = 0;
  effect(() => {
    // Read all three
    x.value; y.value; z.value;
    effectFiredCount++;
  });
  return {
    x, y, z,
    getEffectFiredCount: () => effectFiredCount,
    updateAll: (newX: number, newY: number, newZ: number) => {
      batch(() => {
        x.value = newX;
        y.value = newY;
        z.value = newZ;
      });
    }
  };
}`
    },
    testCode: `import assert from 'node:assert/strict';
import { createHighFrequencyUpdater } from './HighFrequencyUpdater.js';
const updater = createHighFrequencyUpdater();
assert.equal(updater.getEffectFiredCount(), 1);
updater.updateAll(10, 20, 30);
assert.equal(updater.getEffectFiredCount(), 2);`
  },

  // 16. Accessibility
  {
    id: 16,
    category: 'Accessibility',
    name: 'Aria-Compliant Modal Dialog',
    prompt: 'Build an accessible ModalDialog component with role="dialog", aria-modal="true", aria-labelledby linking to modal title, and a close button with an accessible label.',
    expectedFiles: ['ModalDialog.ts'],
    referenceCode: {
      'ModalDialog.ts': `import { template, bindText, on, Show } from '@samrey/runtime';
export function ModalDialog(props: { isOpen: () => boolean; title: string; onClose: () => void }) {
  const _modalTmpl = template('<div role="dialog" aria-modal="true" aria-labelledby="modal-title" class="modal-backdrop"><div class="modal-box"><h2 id="modal-title" ref="t"></h2><button ref="closeBtn" aria-label="Close modal">✕</button></div></div>');
  return Show({
    when: props.isOpen,
    children: () => {
      const root = _modalTmpl.clone();
      bindText(root.refs.t, () => props.title);
      on(root.refs.closeBtn, 'click', props.onClose);
      return root;
    }
  });
}`
    },
    testCode: `import assert from 'node:assert/strict';
import { renderTest } from '@samrey/testing';
import { ModalDialog } from './ModalDialog.js';
const { container } = renderTest(() => ModalDialog({ isOpen: () => true, title: 'Confirm Action', onClose: () => {} }));
const dialog = container.querySelector('[role="dialog"]');
assert.ok(dialog);
assert.equal(dialog.getAttribute('aria-modal'), 'true');
assert.equal(container.querySelector('#modal-title')?.textContent, 'Confirm Action');`
  },

  // 17. Security
  {
    id: 17,
    category: 'Security',
    name: 'Sanitized User Comment Renderer',
    prompt: 'Build a UserCommentView component that receives untrusted author markup and URL, sanitizes them with sanitizeHtml and sanitizeUrl from @samrey/security, and safely binds them to the DOM.',
    expectedFiles: ['UserCommentView.ts'],
    referenceCode: {
      'UserCommentView.ts': `import { sanitizeHtml, sanitizeUrl } from '@samrey/security';
import { template, bindAttr } from '@samrey/runtime';
const _tmpl = template('<div class="comment"><a ref="authorLink" target="_blank">Author</a><div ref="body" class="body"></div></div>');
export function UserCommentView(props: { authorUrl: string; htmlContent: string }) {
  const root = _tmpl.clone();
  const { authorLink, body } = root.refs;
  const safeUrl = sanitizeUrl(props.authorUrl);
  bindAttr(authorLink, 'href', () => safeUrl);
  body.innerHTML = sanitizeHtml(props.htmlContent);
  return root;
}`
    },
    testCode: `import assert from 'node:assert/strict';
import { renderTest } from '@samrey/testing';
import { UserCommentView } from './UserCommentView.js';
const { container } = renderTest(() => UserCommentView({
  authorUrl: 'javascript:alert(1)',
  htmlContent: '<p>Valid</p><script>evil()</script>'
}));
assert.equal(container.querySelector('a')?.getAttribute('href'), 'about:blank');
assert.ok(!container.innerHTML.includes('<script>'));`
  },

  // 18. Refactoring
  {
    id: 18,
    category: 'Refactoring',
    name: 'Refactor QuerySelector to Template References',
    prompt: 'Refactor a legacy component that called document.querySelector multiple times to use modern Samrey template references (_tmpl.clone() and root.refs).',
    expectedFiles: ['ModernProfile.ts'],
    referenceCode: {
      'ModernProfile.ts': `import { template, bindText } from '@samrey/runtime';
const _tmpl = template('<div class="profile"><span ref="name"></span><span ref="badge"></span></div>');
export function ModernProfile(props: { name: string; badge: string }) {
  const root = _tmpl.clone();
  bindText(root.refs.name, () => props.name);
  bindText(root.refs.badge, () => props.badge);
  return root;
}`
    },
    testCode: `import assert from 'node:assert/strict';
import { renderTest } from '@samrey/testing';
import { ModernProfile } from './ModernProfile.js';
const { container } = renderTest(() => ModernProfile({ name: 'Grace Hopper', badge: 'Admiral' }));
assert.equal(container.querySelectorAll('span')[0].textContent, 'Grace Hopper');
assert.equal(container.querySelectorAll('span')[1].textContent, 'Admiral');`
  },

  // 19. Migration from another framework
  {
    id: 19,
    category: 'Migration from Another Framework',
    name: 'React to Samrey Component Migration',
    prompt: 'Translate a React component using useState and onClick into an idiomatic Samrey component with signal(), template(), bindText(), and on(). Zero React dependencies allowed.',
    expectedFiles: ['ToggleSwitch.ts'],
    referenceCode: {
      'ToggleSwitch.ts': `import { signal } from '@samrey/reactivity';
import { template, bindText, bindClass, on } from '@samrey/runtime';
const _tmpl = template('<button ref="btn" class="toggle"><span ref="lbl"></span></button>');
export function ToggleSwitch(props: { initial?: boolean } = {}) {
  const onState = signal(props.initial ?? false);
  const root = _tmpl.clone();
  const { btn, lbl } = root.refs;
  bindClass(btn, 'is-active', () => onState.value);
  bindText(lbl, () => onState.value ? 'ON' : 'OFF');
  on(btn, 'click', () => onState.update(v => !v));
  return root;
}`
    },
    testCode: `import assert from 'node:assert/strict';
import { renderTest, fireEvent, flushReactivity } from '@samrey/testing';
import { ToggleSwitch } from './ToggleSwitch.js';
const { container } = renderTest(() => ToggleSwitch({ initial: false }));
assert.equal(container.querySelector('span')?.textContent, 'OFF');
fireEvent(container.querySelector('button')!, 'click');
await flushReactivity();
assert.equal(container.querySelector('span')?.textContent, 'ON');`
  },

  // 20. Building a complete application
  {
    id: 20,
    category: 'Building a Complete Application',
    name: 'Mini Todo Application with Filter',
    prompt: 'Build a complete TodoApplication with input form, add button, item listing with For(), filter buttons (All / Active / Completed), and active item counter.',
    expectedFiles: ['TodoApplication.ts'],
    referenceCode: {
      'TodoApplication.ts': `import { signal, computed } from '@samrey/reactivity';
import { template, bindText, on, For } from '@samrey/runtime';
export interface TodoItem { id: number; text: string; done: boolean; }
const _appTmpl = template('<div class="todo-app"><header><h2>Todos</h2><input ref="input" /><button ref="addBtn">Add</button></header><div class="filters"><button ref="allBtn">All</button><button ref="actBtn">Active</button></div><ul ref="list"></ul><footer>Items: <span ref="count"></span></footer></div>');
const _rowTmpl = template('<li><span ref="txt"></span><button ref="toggleBtn">Toggle</button></li>');
export function TodoApplication() {
  const todos = signal<TodoItem[]>([{ id: 1, text: 'First task', done: false }]);
  const filter = signal<'all' | 'active'>('all');
  const filtered = computed(() => {
    if (filter.value === 'active') return todos.value.filter(t => !t.done);
    return todos.value;
  });
  const count = computed(() => todos.value.filter(t => !t.done).length);
  const root = _appTmpl.clone();
  const { input, addBtn, allBtn, actBtn, list, count: countEl } = root.refs;
  bindText(countEl, () => count.value.toString());
  on(allBtn, 'click', () => { filter.value = 'all'; });
  on(actBtn, 'click', () => { filter.value = 'active'; });
  on(addBtn, 'click', () => {
    const inp = input as HTMLInputElement;
    if (inp.value.trim()) {
      todos.value = [...todos.value, { id: Date.now(), text: inp.value.trim(), done: false }];
      inp.value = '';
    }
  });
  list.appendChild(For({
    each: () => filtered.value,
    key: (t) => t.id,
    children: (t) => {
      const row = _rowTmpl.clone();
      bindText(row.refs.txt, () => t.text);
      on(row.refs.toggleBtn, 'click', () => {
        todos.update(items => items.map(i => i.id === t.id ? { ...i, done: !i.done } : i));
      });
      return row;
    }
  }));
  return root;
}`
    },
    testCode: `import assert from 'node:assert/strict';
import { renderTest, fireEvent, flushReactivity } from '@samrey/testing';
import { TodoApplication } from './TodoApplication.js';
const { container } = renderTest(() => TodoApplication());
assert.ok(container.textContent?.includes('First task'));
assert.equal(container.querySelector('footer span')?.textContent, '1');
const input = container.querySelector('header input')!;
input.value = 'Second task';
fireEvent(container.querySelector('header button')!, 'click');
await flushReactivity();
assert.ok(container.textContent?.includes('Second task'));
assert.equal(container.querySelector('footer span')?.textContent, '2');`
  }
];
