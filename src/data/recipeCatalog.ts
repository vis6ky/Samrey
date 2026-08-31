/**
 * @license Apache-2.0
 * @samrey/doc - Samrey Framework v1.0.0 Implementation Recipe Catalog
 *
 * Structured recipes for solving common development tasks using official @samrey/* APIs.
 * Follows the strict problem-solution recipe schema:
 * - PROBLEM
 * - SAMREY CONCEPT
 * - RECOMMENDED API
 * - IMPLEMENTATION (TypeScript code)
 * - HOW IT WORKS
 * - WHEN TO USE
 * - ALTERNATIVE
 * - COMMON MISTAKES
 * - RELATED APIs
 * - DOCUMENTATION (Links)
 */

import { AssistantAnswer } from './assistantKnowledge.js';

export type RecipeCategory =
  | 'component-communication'
  | 'reactive-state'
  | 'dom-manipulation'
  | 'conditional-rendering'
  | 'list-rendering'
  | 'events'
  | 'forms'
  | 'validation'
  | 'http-api'
  | 'routing'
  | 'ssr'
  | 'ssg'
  | 'security'
  | 'error-handling'
  | 'lifecycle'
  | 'cleanup'
  | 'performance'
  | 'testing'
  | 'devtools';

export interface Recipe {
  id: string;
  category: RecipeCategory;
  categoryLabel: string;
  keywords: string[];
  problem: string;
  samreyConcept: string;
  recommendedApi: string;
  implementation: string;
  howItWorks: string;
  whenToUse: string;
  alternative: string;
  commonMistakes: string[];
  relatedApis: string[];
  documentation: Array<{ label: string; url: string; sourcePath?: string }>;
}

export const RECIPES: Recipe[] = [
  // 1. Component communication
  {
    id: 'recipe-component-communication',
    category: 'component-communication',
    categoryLabel: 'Component Data Transfer & Communication',
    keywords: [
      'transfer data', 'component communication', 'parent child', 'pass props', 'share state',
      'pass signal', 'props', 'context', 'sibling communication', 'data flow'
    ],
    problem: 'Component-to-component data communication',
    samreyConcept: 'Reactive state communication via passed signal Props and createContext / useContext',
    recommendedApi: '@samrey/reactivity -> signal() / Props & createContext',
    implementation: `import { signal, ReadonlySignal, createContext, useContext } from '@samrey/reactivity';
import { el } from '@samrey/runtime';

// 1. Passing Signal Props to Child Components
function CounterDisplay(props: { count: ReadonlySignal<number>; onIncrement: () => void }) {
  return el('div', { class: 'p-4 border rounded-xl space-y-2' },
    el('p', null, () => \`Current Count: \${props.count.value}\`),
    el('button', {
      onClick: props.onIncrement,
      class: 'px-3 py-1 bg-indigo-600 text-white rounded'
    }, 'Increment')
  );
}

// 2. Parent Component creates the signal
export function ParentComponent() {
  const count = signal(0);
  const increment = () => { count.value++; };

  return el('div', { class: 'space-y-4' },
    el('h3', null, 'Parent Component Data Transfer'),
    CounterDisplay({ count, onIncrement: increment })
  );
}`,
    howItWorks: 'In Samrey, components execute once during initial instantiation. Passing a Signal reference (or ReadonlySignal) as a prop allows child DOM nodes to bind directly to reactive updates. When the signal changes, only the specific text node inside CounterDisplay updates—neither parent nor child component functions re-execute.',
    whenToUse: 'Use passed signal props for parent-child communication, callbacks for child-to-parent actions, and createContext/useContext for deeply nested component hierarchies.',
    alternative: 'createStore() for shared application state or createContext() / useContext() for deep tree dependency injection',
    commonMistakes: [
      'Unwrapping props.count.value at the component setup root instead of inside a reactive getter (() => props.count.value).',
      'Expecting component functions to re-execute on every state change like React (Samrey components run once).'
    ],
    relatedApis: ['signal', 'computed', 'createStore', 'effect', 'createContext', 'useContext'],
    documentation: [
      { label: 'Reactivity & Control Flow', url: '#reactivity', sourcePath: 'docs/REACTIVITY_AND_CONTROL_FLOW.md' },
      { label: 'Templates & Components', url: '#docs', sourcePath: 'docs/TEMPLATES_AND_COMPONENTS.md' },
      { label: 'Public API Specification', url: '#architecture', sourcePath: 'docs/PUBLIC_API.md' }
    ]
  },

  // 2. Reactive state
  {
    id: 'recipe-reactive-state',
    category: 'reactive-state',
    categoryLabel: 'Reactive State & Store Management',
    keywords: [
      'reactive state', 'create store', 'create signal', 'computed', 'derived state', 'batch state',
      'side effect', 'state management', 'store', 'signals', 'produce'
    ],
    problem: 'Managing synchronous reactive state, deep stores, computed derivations, and batched mutations',
    samreyConcept: 'Fine-grained push-pull dependency graph with automated path tracking',
    recommendedApi: '@samrey/reactivity -> signal(), computed(), createStore(), produce()',
    implementation: `import { signal, computed, effect, batch, createStore, produce } from '@samrey/reactivity';

// 1. Primitive Signal & Computed derivation
const count = signal(10);
const price = signal(25);
const total = computed(() => count.value * price.value);

// 2. Deep Reactive Store with produce()
const store = createStore({
  user: { name: 'Alex', role: 'developer' },
  preferences: { theme: 'dark', notifications: true }
});

// Update store mutably via produce draft
produce(store, (draft) => {
  draft.user.name = 'Alexander';
  draft.preferences.theme = 'light';
});

// 3. Batched Signal Mutation
batch(() => {
  count.value = 20;
  price.value = 30;
});`,
    howItWorks: 'Signals and Stores track active observer functions during execution. When a value is updated, dirty flags propagate through the topological dependency graph, updating computed values lazily and executing effects once per batch cycle.',
    whenToUse: 'Use signal() for primitive values and local states; use createStore() with produce() for nested domain state trees.',
    alternative: 'createStore() for shared application state or Context API for scoped state provision',
    commonMistakes: [
      'Mutating signal values inside computed() getters (computed derivations must be pure functions).',
      'Forgetting to call dispose() when creating unmanaged top-level effects outside component scopes.'
    ],
    relatedApis: ['signal', 'computed', 'createStore', 'produce', 'effect', 'batch', 'untrack'],
    documentation: [
      { label: 'Reactivity Guide', url: '#reactivity', sourcePath: 'docs/REACTIVITY_AND_CONTROL_FLOW.md' },
      { label: 'Public API Specification', url: '#architecture', sourcePath: 'docs/PUBLIC_API.md' }
    ]
  },

  // 3. DOM manipulation
  {
    id: 'recipe-dom-manipulation',
    category: 'dom-manipulation',
    categoryLabel: 'DOM Manipulation',
    keywords: [
      'dom manipulation', 'create element', 'bind attribute', 'bind class', 'bind style',
      'el function', 'direct dom', 'micro updates'
    ],
    problem: 'Creating native DOM elements with reactive attribute, class, style, and text bindings',
    samreyConcept: 'Direct real DOM instantiation without Virtual DOM abstraction overhead',
    recommendedApi: '@samrey/runtime -> el()',
    implementation: `import { signal } from '@samrey/reactivity';
import { el } from '@samrey/runtime';

export function UserBadge() {
  const isOnline = signal(true);
  const role = signal('admin');

  return el('div', {
    // Dynamic reactive class binding via getter function
    class: () => \`badge \${isOnline.value ? 'bg-emerald-500 text-white' : 'bg-slate-300 text-slate-700'}\`,
    'data-role': () => role.value,
    style: () => ({ opacity: isOnline.value ? '1' : '0.6' })
  },
    // Dynamic text binding
    el('span', null, () => isOnline.value ? 'Online' : 'Offline')
  );
}`,
    howItWorks: 'el() creates native DOM nodes (document.createElement) and evaluates property objects. When a value is a function (getter), el() registers a targeted micro-effect that updates the specific DOM attribute, classList, or text node directly whenever reactive dependencies change.',
    whenToUse: 'Use el() for all programmatic DOM construction, component rendering, and reactive attribute bindings.',
    alternative: 'JSX / Template compilation with @samrey/compiler for declarative markup',
    commonMistakes: [
      'Passing a static evaluation class: isOnline.value instead of a reactive getter class: () => isOnline.value.',
      'Using element.innerHTML directly without @samrey/security sanitization.'
    ],
    relatedApis: ['el', 'svg', 'fragment', 'text', 'mount'],
    documentation: [
      { label: 'Templates and Components', url: '#docs', sourcePath: 'docs/TEMPLATES_AND_COMPONENTS.md' },
      { label: 'Runtime API Reference', url: '#architecture', sourcePath: 'docs/PUBLIC_API.md' }
    ]
  },

  // 4. Conditional rendering
  {
    id: 'recipe-conditional-rendering',
    category: 'conditional-rendering',
    categoryLabel: 'Conditional Rendering',
    keywords: [
      'conditional rendering', 'show component', 'switch match', 'if else', 'toggle element',
      'conditional dom', 'fallback ui'
    ],
    problem: 'Conditionally rendering UI elements and fallback branches based on reactive state',
    samreyConcept: 'Fine-grained control flow preserving DOM node identity across condition toggles',
    recommendedApi: '@samrey/runtime -> Show()',
    implementation: `import { signal } from '@samrey/reactivity';
import { el, Show } from '@samrey/runtime';

export function AuthPanel() {
  const isAuthenticated = signal(false);
  const username = signal('Alice');

  return el('div', { class: 'p-4' },
    Show({
      when: () => isAuthenticated.value,
      fallback: () => el('button', {
        onClick: () => { isAuthenticated.value = true; },
        class: 'px-4 py-2 bg-indigo-600 text-white rounded-lg'
      }, 'Sign In'),
      children: () => el('div', { class: 'space-y-2' },
        el('p', null, () => \`Welcome back, \${username.value}!\`),
        el('button', {
          onClick: () => { isAuthenticated.value = false; },
          class: 'text-xs text-slate-500 underline'
        }, 'Sign Out')
      )
    })
  );
}`,
    howItWorks: 'Show() subscribes to the when accessor. When the condition flips between truthy and falsy, it cleanly disposes the outgoing branch and inserts the incoming branch without re-rendering parent components.',
    whenToUse: 'Use Show() for binary condition toggling and fallback states. Use Switch / Match for multi-branch enum pattern matching.',
    alternative: 'Switch / Match components for multi-case pattern matching',
    commonMistakes: [
      'Using JavaScript ternary isAuthenticated.value ? el(...) : el(...) at the top level of a component (which evaluates only once at mount time!).'
    ],
    relatedApis: ['Show', 'Switch', 'Match', 'Dynamic'],
    documentation: [
      { label: 'Reactivity and Control Flow', url: '#reactivity', sourcePath: 'docs/REACTIVITY_AND_CONTROL_FLOW.md' }
    ]
  },

  // 5. List rendering
  {
    id: 'recipe-list-rendering',
    category: 'list-rendering',
    categoryLabel: 'List Rendering',
    keywords: [
      'list rendering', 'for component', 'render array', 'keyed list', 'list reconciliation',
      'loop array', 'table rendering'
    ],
    problem: 'Efficiently rendering and updating dynamic collections, lists, and tables',
    samreyConcept: 'Keyed fine-grained DOM reconciliation without full array re-rendering',
    recommendedApi: '@samrey/runtime -> For()',
    implementation: `import { signal } from '@samrey/reactivity';
import { el, For } from '@samrey/runtime';

interface TodoItem {
  id: string;
  title: string;
  completed: boolean;
}

export function TodoList() {
  const todos = signal<TodoItem[]>([
    { id: '1', title: 'Learn Samrey Signals', completed: true },
    { id: '2', title: 'Build High-Performance App', completed: false }
  ]);

  return el('ul', { class: 'space-y-2' },
    For({
      each: () => todos.value,
      key: (item) => item.id,
      fallback: () => el('li', { class: 'text-slate-400 text-sm' }, 'No todos in list.'),
      children: (item) => el('li', { class: 'flex items-center space-x-2' },
        el('span', { class: item.completed ? 'line-through text-slate-400' : 'text-slate-800' }, item.title)
      )
    })
  );
}`,
    howItWorks: 'For() tracks list items by unique keys. When the array is mutated (items reordered, added, or deleted), For() executes keyed DOM reconciliation, moving or inserting only the changed DOM nodes while preserving unmodified elements and their local state.',
    whenToUse: 'Use For() for dynamic arrays, data grids, feeds, and item lists.',
    alternative: 'Static array.map() if the list is completely static and never updates',
    commonMistakes: [
      'Using array index as key for items that can be reordered or removed.',
      'Calling .map() on signal.value directly outside a reactive control flow container.'
    ],
    relatedApis: ['For', 'Show', 'reconcile'],
    documentation: [
      { label: 'Reactivity & Control Flow', url: '#reactivity', sourcePath: 'docs/REACTIVITY_AND_CONTROL_FLOW.md' }
    ]
  },

  // 6. Events
  {
    id: 'recipe-events',
    category: 'events',
    categoryLabel: 'Events & Interactions',
    keywords: [
      'events', 'handle click', 'event listener', 'user interaction', 'keyboard event',
      'custom event', 'event delegation'
    ],
    problem: 'Handling user interactions, keyboard shortcuts, and custom events',
    samreyConcept: 'Direct native event binding with automatic listener disposal',
    recommendedApi: '@samrey/runtime -> el({ onClick, onKeyDown, ... })',
    implementation: `import { signal } from '@samrey/reactivity';
import { el } from '@samrey/runtime';

export function ActionButton() {
  const clickCount = signal(0);

  const handleClick = (e: MouseEvent) => {
    e.preventDefault();
    clickCount.value++;
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Enter') {
      clickCount.value++;
    }
  };

  return el('button', {
    onClick: handleClick,
    onKeyDown: handleKeyDown,
    class: 'px-4 py-2 bg-indigo-600 text-white font-medium rounded-lg shadow-sm hover:bg-indigo-700'
  },
    () => \`Clicked: \${clickCount.value}\`
  );
}`,
    howItWorks: 'Property keys starting with "on" (e.g. onClick, onInput, onKeyDown) are attached directly via element.addEventListener(). Handlers receive standard native DOM event objects.',
    whenToUse: 'For handling clicks, text input, pointer events, form submissions, and keyboard navigation.',
    alternative: 'Direct element.addEventListener() in onMount() with cleanup in onCleanup() for custom document/window events',
    commonMistakes: [
      'Attaching window or document event listeners without unregistering them in onCleanup().'
    ],
    relatedApis: ['el', 'onMount', 'onCleanup', 'fireEvent'],
    documentation: [
      { label: 'Templates & Components', url: '#docs', sourcePath: 'docs/TEMPLATES_AND_COMPONENTS.md' }
    ]
  },

  // 7. Forms
  {
    id: 'recipe-forms',
    category: 'forms',
    categoryLabel: 'Form State & Inputs',
    keywords: [
      'forms', 'createForm', 'form inputs', 'dirty tracking', 'form submission',
      'reset form', 'input binding'
    ],
    problem: 'Managing complex form state, input bindings, dirty/touched states, and submission',
    samreyConcept: 'Reactive form controllers with fine-grained field signal subscriptions',
    recommendedApi: '@samrey/forms -> createForm(), createField()',
    implementation: `import { createForm, createField } from '@samrey/forms';
import { el } from '@samrey/runtime';

export function ContactForm() {
  const form = createForm({
    initialValues: { name: '', message: '' },
    onSubmit: async (values) => {
      console.log('Submitted form data:', values);
    }
  });

  const nameField = createField(form, 'name');

  return el('form', {
    onSubmit: (e: Event) => {
      e.preventDefault();
      form.handleSubmit();
    },
    class: 'space-y-4'
  },
    el('input', {
      type: 'text',
      placeholder: 'Your name',
      value: () => nameField.value.value,
      onInput: (e: any) => nameField.setValue(e.target.value),
      onBlur: () => nameField.setTouched(true),
      class: 'w-full p-2 border rounded'
    }),
    el('button', {
      type: 'submit',
      disabled: () => form.isSubmitting.value,
      class: 'px-4 py-2 bg-indigo-600 text-white rounded'
    }, () => form.isSubmitting.value ? 'Sending...' : 'Submit')
  );
}`,
    howItWorks: 'createForm() manages values, dirty flags, touched states, and errors as reactive signals. Fields can be bound individually so typing in one field only updates that specific input without triggering form-wide re-renders.',
    whenToUse: 'For interactive forms requiring validation, dirty tracking, disabled submission states, or reset capabilities.',
    alternative: 'Simple signal(\'\') for single unvalidated search inputs',
    commonMistakes: [
      'Mutating form values directly rather than calling field.setValue() or form.setValues().'
    ],
    relatedApis: ['createForm', 'createField', 'validateSchema', 'getAccessibleFieldProps'],
    documentation: [
      { label: 'Forms and Validation', url: '#docs', sourcePath: 'docs/FORMS_AND_VALIDATION.md' }
    ]
  },

  // 8. Validation
  {
    id: 'recipe-validation',
    category: 'validation',
    categoryLabel: 'Schema Validation',
    keywords: [
      'validation', 'standard schema', 'zod validation', 'valibot', 'arktype',
      'field errors', 'aria validation'
    ],
    problem: 'Validating form data with type-safe Standard Schema (Zod, Valibot, ArkType) and accessible ARIA error feedback',
    samreyConcept: 'Interoperable Standard Schema (~standard v1) validation engine',
    recommendedApi: '@samrey/forms -> createForm({ schema }), createField()',
    implementation: `import { createForm } from '@samrey/forms';
import { el, Show } from '@samrey/runtime';
import { z } from 'zod'; // Standard Schema compliant

const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters')
});

export function LoginForm() {
  const form = createForm({
    initialValues: { email: '', password: '' },
    schema: loginSchema,
    onSubmit: async (validData) => {
      console.log('Login credentials validated:', validData);
    }
  });

  const emailField = form.field('email');
  const passwordField = form.field('password');

  return el('form', {
    onSubmit: form.handleSubmit
  },
    el('input', {
      type: 'email',
      value: () => emailField.value.value,
      onInput: (e: Event) => emailField.value.set((e.target as HTMLInputElement).value),
      onBlur: () => emailField.touched.set(true)
    }),
    Show({
      when: () => emailField.touched.value && !!emailField.error.value,
      children: () => el('p', { class: 'text-xs text-red-600 mt-1' }, () => emailField.error.value)
    })
  );
}`,
    howItWorks: '@samrey/forms validates against any Standard Schema (~standard v1) library, automatically populating field error signals and generating aria-invalid and aria-describedby attributes for accessibility.',
    whenToUse: 'When validating user input against declarative schemas with synchronous or asynchronous validation rules.',
    alternative: 'Custom validator functions returning error strings for simple lightweight cases',
    commonMistakes: [
      'Validating only on client submit without displaying field-level blur errors.',
      'Neglecting accessible ARIA labels for screen readers when displaying error messages.'
    ],
    relatedApis: ['createForm', 'createField', 'standardSchemaValidator', 'deriveAriaAttributes'],
    documentation: [
      { label: 'Forms and Validation', url: '#docs', sourcePath: 'docs/FORMS_AND_VALIDATION.md' }
    ]
  },

  // 9. HTTP/API calls
  {
    id: 'recipe-http-api',
    category: 'http-api',
    categoryLabel: 'HTTP & API Calls',
    keywords: [
      'call api', 'http fetch', 'createHttpClient', 'resource', 'fetch data', 'async resource',
      'api request', 'loading state'
    ],
    problem: 'Fetching asynchronous data from REST/GraphQL APIs with reactive loading, error, and refetch states',
    samreyConcept: 'Declarative async resource primitives with automated dependency tracking',
    recommendedApi: '@samrey/http -> createHttpClient(), resource()',
    implementation: `import { signal } from '@samrey/reactivity';
import { createHttpClient, resource } from '@samrey/http';
import { el, Show } from '@samrey/runtime';

interface User { id: string; name: string; email: string; }

const api = createHttpClient({ baseUrl: 'https://api.example.com' });

export function UserProfile() {
  const userId = signal('101');

  // Resource automatically refetches whenever userId signal changes
  const userResource = resource(async () => {
    return api.get<User>(\`/users/\${userId.value}\`);
  });

  return el('div', { class: 'p-4' },
    Show({
      when: () => userResource.loading.value,
      children: () => el('div', { class: 'animate-pulse text-indigo-600' }, 'Loading user profile...')
    }),
    Show({
      when: () => !!userResource.error.value,
      children: () => el('div', { class: 'text-red-600' }, () => \`Failed to load: \${userResource.error.value?.message}\`)
    }),
    Show({
      when: () => !!userResource.data.value,
      children: () => el('div', { class: 'space-y-1' },
        el('h2', { class: 'font-bold' }, () => userResource.data.value?.name),
        el('p', { class: 'text-slate-600' }, () => userResource.data.value?.email)
      )
    }),
    el('button', { onClick: () => userResource.refetch(), class: 'mt-2 px-3 py-1 bg-slate-200 rounded' }, 'Refresh')
  );
}`,
    howItWorks: 'resource() links an async fetcher to reactive state. It exposes data, loading, and error signals, and automatically handles request deduplication, cancellation, and refetching.',
    whenToUse: 'For all asynchronous API fetching, remote queries, and data loading workflows.',
    alternative: 'Manual native fetch() in an effect() with explicit signal state management',
    commonMistakes: [
      'Calling resource() inside click handlers instead of declaring it at component setup time.',
      'Forgetting to display the error signal, causing unhandled promise rejections.'
    ],
    relatedApis: ['createHttpClient', 'resource', 'createCache', 'fetchResource'],
    documentation: [
      { label: 'Router and HTTP Guide', url: '#docs', sourcePath: 'docs/ROUTER_AND_HTTP.md' }
    ]
  },

  // 10. Routing
  {
    id: 'recipe-routing',
    category: 'routing',
    categoryLabel: 'Routing & Navigation',
    keywords: [
      'routing', 'create route', 'navigation', 'useParams', 'useRouter', 'Link component',
      'spa router', 'client side routing'
    ],
    problem: 'Declarative client-side routing, URL matching, route parameter extraction, and programmatic navigation',
    samreyConcept: 'Zero-dependency reactive router with parameterized pattern matching',
    recommendedApi: '@samrey/router -> Router, Route, Link, useParams, useRouter',
    implementation: `import { createRouter, Router, Route, Link, useParams, useRouter } from '@samrey/router';
import { el } from '@samrey/runtime';

function UserDetail() {
  const params = useParams();
  const router = useRouter();

  return el('div', { class: 'p-4' },
    el('h2', null, () => \`User Profile ID: \${params.value.id}\`),
    el('button', {
      onClick: () => router.navigate('/dashboard'),
      class: 'px-3 py-1 bg-slate-900 text-white rounded'
    }, 'Back to Dashboard')
  );
}

export function AppRouter() {
  const router = createRouter({
    routes: [
      { path: '/', component: () => el('h1', null, 'Home Page') },
      { path: '/dashboard', component: () => el('h1', null, 'Dashboard') },
      { path: '/users/:id', component: UserDetail }
    ]
  });

  return Router({
    router,
    children: [
      Route({ path: '/', component: () => el('h1', null, 'Home Page') }),
      Route({ path: '/dashboard', component: () => el('h1', null, 'Dashboard') }),
      Route({ path: '/users/:id', component: UserDetail })
    ]
  });
}`,
    howItWorks: 'Router listens for pushState and popstate events, matches the browser pathname against route definitions, and swaps the matched component signal without full page reloads.',
    whenToUse: 'For single page applications (SPAs) and universal SSR multi-route applications.',
    alternative: 'createMemoryHistory() for isolated unit testing and server-side route simulation',
    commonMistakes: [
      'Using traditional <a href="..."> tags instead of Link({ href: "..." }) which causes hard browser reloads.'
    ],
    relatedApis: ['Router', 'Route', 'Link', 'useRouter', 'useParams', 'useLocation'],
    documentation: [
      { label: 'Router and HTTP Guide', url: '#docs', sourcePath: 'docs/ROUTER_AND_HTTP.md' }
    ]
  },

  // 11. SSR
  {
    id: 'recipe-ssr',
    category: 'ssr',
    categoryLabel: 'Server-Side Rendering (SSR)',
    keywords: [
      'ssr', 'server side rendering', 'renderToString', 'renderToStream', 'hydration',
      'seo optimization', 'server render'
    ],
    problem: 'Rendering components to static HTML strings or streams on Node.js / edge servers and hydrating on the client',
    samreyConcept: 'Isomorphic component rendering with state dehydration and client-side hydration',
    recommendedApi: '@samrey/ssr -> renderToString(), renderToStream(), serializeState()',
    implementation: `import { renderToString, serializeState } from '@samrey/ssr';
import { signal } from '@samrey/reactivity';
import { el, hydrate } from '@samrey/runtime';

function App(props: { initialCount: number }) {
  const count = signal(props.initialCount);
  return el('div', { id: 'app' },
    el('h1', null, 'Samrey Server-Rendered App'),
    el('p', null, () => \`Count: \${count.value}\`)
  );
}

// Server Route Handler (Node / Express / Fastify / Cloudflare Workers)
export async function handleRequest() {
  const initialData = { initialCount: 42 };
  const html = await renderToString(() => App(initialData));
  const safeState = serializeState(initialData);

  return \`<!DOCTYPE html>
<html>
  <head><title>Samrey SSR</title></head>
  <body>
    <div id="root">\${html}</div>
    <script id="__SAMREY_STATE__" type="application/json">\${safeState}</script>
  </body>
</html>\`;
}`,
    howItWorks: 'renderToString() executes the component tree in Node, evaluates initial signal values, and emits semantic HTML. serializeState() securely serializes state while stripping private keys before embedding into the client HTML payload.',
    whenToUse: 'For SEO-sensitive websites, fast First Contentful Paint (FCP), and content-heavy applications.',
    alternative: 'renderToStream() for chunked web streams and fast Time to First Byte (TTFB)',
    commonMistakes: [
      'Accessing browser globals (window, document, localStorage) during top-level SSR component setup.'
    ],
    relatedApis: ['renderToString', 'renderToStream', 'serializeState', 'hydrateState', 'hydrate'],
    documentation: [
      { label: 'SSR & Hydration Guide', url: '#docs', sourcePath: 'docs/SSR_AND_HYDRATION.md' }
    ]
  },

  // 12. SSG
  {
    id: 'recipe-ssg',
    category: 'ssg',
    categoryLabel: 'Static Site Generation (SSG)',
    keywords: [
      'ssg', 'static site generation', 'pre render', 'generate static site',
      'static html build', 'export static'
    ],
    problem: 'Pre-rendering application routes into static HTML files at build time for CDN deployment',
    samreyConcept: 'Build-time route pre-rendering with zero server runtime overhead',
    recommendedApi: '@samrey/ssr -> renderToString()',
    implementation: `import { renderToString } from '@samrey/ssr';
import { el } from '@samrey/runtime';

function ProductPage(props: { id: string }) {
  return el('div', { class: 'p-6' },
    el('h1', null, \`Product \${props.id}\`),
    el('p', null, 'Pre-rendered statically at build time.')
  );
}

export async function buildStaticSite(): Promise<Record<string, string>> {
  const routes = ['1', '2', '3'];
  const pages: Record<string, string> = {};

  for (const id of routes) {
    const body = await renderToString(() => ProductPage({ id }));
    pages[\`/products/\${id}\`] = \`<!DOCTYPE html><html><body>\${body}</body></html>\`;
  }
  return pages;
}`,
    howItWorks: 'renderToString() renders each route to an HTML string at build time, saving static .html files ready for CDN hosting on Cloudflare Pages, Vercel, or GitHub Pages.',
    whenToUse: 'For blogs, documentation portals, landing pages, and marketing websites.',
    alternative: 'SSR with edge caching for dynamic personalized content',
    commonMistakes: [
      'Relying on request headers or user session cookies during static build time.'
    ],
    relatedApis: ['renderToString', 'serializeState', 'createSsrContext'],
    documentation: [
      { label: 'SSR and SSG Guide', url: '#docs', sourcePath: 'docs/SSR_AND_HYDRATION.md' },
      { label: 'CLI & Tooling', url: '#docs', sourcePath: 'docs/CLI_AND_TOOLING.md' }
    ]
  },

  // 13. Security
  {
    id: 'recipe-security',
    category: 'security',
    categoryLabel: 'Security & Sanitization',
    keywords: [
      'security', 'prevent xss', 'sanitize html', 'sanitize uri', 'csrf token',
      'prototype pollution', 'trusted types'
    ],
    problem: 'Preventing Cross-Site Scripting (XSS), URI injection, CSRF, and prototype pollution',
    samreyConcept: 'Zero-trust runtime sanitization and safe JSON deserialization',
    recommendedApi: '@samrey/security -> sanitizeHtml(), sanitizeUri(), safeJsonParse()',
    implementation: `import { sanitizeHtml, sanitizeUri, safeJsonParse } from '@samrey/security';

// 1. Sanitize untrusted user-generated HTML before rendering
const rawUserInput = '<script>evil()</script><p>Clean Text</p>';
const safeHtml = sanitizeHtml(rawUserInput); // Escapes script tags

// 2. Validate external user URIs (prevents javascript: attacks)
const untrustedUri = 'javascript:stealTokens()';
const safeUri = sanitizeUri(untrustedUri); // Becomes "about:blank"

// 3. Safe JSON parsing (immune to prototype pollution __proto__)
const untrustedJson = '{"__proto__": {"isAdmin": true}, "name": "Sam"}';
const safeData = safeJsonParse(untrustedJson);`,
    howItWorks: '@samrey/security provides deterministic sanitizers that neutralize dangerous markup and script URIs before DOM attachment, and scrubs prototype pollution attempts during JSON parsing.',
    whenToUse: 'Whenever rendering user-authored HTML, external links, or parsing untrusted API responses.',
    alternative: 'TrustedTypesPolicy for browser-enforced Trusted Types security policies',
    commonMistakes: [
      'Using element.innerHTML without sanitizing untrusted inputs with sanitizeHtml().'
    ],
    relatedApis: ['sanitizeHtml', 'sanitizeUri', 'safeJsonParse', 'createCsrfToken', 'stripSecrets'],
    documentation: [
      { label: 'Security Specification', url: '#security', sourcePath: 'docs/SECURITY.md' }
    ]
  },

  // 14. Error handling
  {
    id: 'recipe-error-handling',
    category: 'error-handling',
    categoryLabel: 'Error Handling & Boundaries',
    keywords: [
      'error handling', 'error boundary', 'aeth error', 'catch component error',
      'error fallback', 'onError hook'
    ],
    problem: 'Catching runtime errors in component subtrees and diagnosing Samrey framework error codes (AETH-xxx)',
    samreyConcept: 'Declarative error boundaries isolating subtree failures',
    recommendedApi: '@samrey/runtime -> ErrorBoundary, onError',
    implementation: `import { ErrorBoundary, onError, el } from '@samrey/runtime';
import { signal } from '@samrey/reactivity';

function BuggyWidget() {
  const trigger = signal(false);
  if (trigger.value) {
    throw new Error('AETH-301: Circular computed dependency detected');
  }
  return el('button', {
    onClick: () => { trigger.value = true; },
    class: 'px-3 py-1 bg-amber-600 text-white rounded'
  }, 'Trigger Crash');
}

export function ProtectedApp() {
  return ErrorBoundary({
    fallback: (err, reset) => el('div', { class: 'p-4 bg-red-50 border border-red-200 rounded-xl space-y-2' },
      el('h4', { class: 'font-bold text-red-900' }, 'Component Failed to Render'),
      el('p', { class: 'text-xs font-mono text-red-700' }, err.message),
      el('button', { onClick: reset, class: 'px-3 py-1 bg-red-600 text-white text-xs rounded' }, 'Reset Widget')
    ),
    children: () => BuggyWidget()
  });
}`,
    howItWorks: 'ErrorBoundary wraps child execution in an isolated reactive scope. If an uncaught error occurs during initialization or reactive signal propagation, the boundary renders its fallback without crashing the parent application.',
    whenToUse: 'To isolate widget failures (dashboards, charts, payment inputs, rich text editors).',
    alternative: 'onError() lifecycle hook for component-level logging without visual replacement',
    commonMistakes: [
      'Attempting to wrap JSX/el() in standard JavaScript try/catch (which misses async signal updates).'
    ],
    relatedApis: ['ErrorBoundary', 'onError', 'ERROR_REGISTRY'],
    documentation: [
      { label: 'Error Codes Reference', url: '#docs', sourcePath: 'docs/ERROR_CODES.md' }
    ]
  },

  // 15. Lifecycle
  {
    id: 'recipe-lifecycle',
    category: 'lifecycle',
    categoryLabel: 'Lifecycle & DOM Attachment',
    keywords: [
      'lifecycle', 'onMount', 'component mount', 'dom attached', 'init third party',
      'canvas init'
    ],
    problem: 'Executing initialization code after DOM elements are mounted and attached to the document',
    samreyConcept: 'Single-execution component setup with post-attachment lifecycle hooks',
    recommendedApi: '@samrey/runtime -> onMount()',
    implementation: `import { onMount, el } from '@samrey/runtime';
import { signal } from '@samrey/reactivity';

export function CanvasGraph() {
  const canvasElement = el('canvas', { width: 400, height: 200, class: 'border rounded' });

  onMount(() => {
    // Canvas is guaranteed to be in the DOM
    const canvas = canvasElement as HTMLCanvasElement;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.fillStyle = '#4f46e5';
      ctx.fillRect(20, 20, 150, 100);
    }
  });

  return el('div', { class: 'space-y-2' },
    el('h3', null, 'Canvas Graphic'),
    canvasElement
  );
}`,
    howItWorks: 'onMount() registers a callback that runs synchronously after the component element is mounted into the active document DOM tree.',
    whenToUse: 'For integrating third-party DOM libraries (Chart.js, D3, Leaflet, WebGL), measuring element bounding rectangles, or focusing inputs.',
    alternative: 'Direct reactive signal bindings for standard HTML attributes and styling',
    commonMistakes: [
      'Accessing DOM layout dimensions before onMount() runs (during initial element creation).'
    ],
    relatedApis: ['onMount', 'onCleanup', 'mount'],
    documentation: [
      { label: 'Templates & Components', url: '#docs', sourcePath: 'docs/TEMPLATES_AND_COMPONENTS.md' }
    ]
  },

  // 16. Cleanup
  {
    id: 'recipe-cleanup',
    category: 'cleanup',
    categoryLabel: 'Cleanup & Resource Disposal',
    keywords: [
      'cleanup', 'onCleanup', 'dispose timer', 'remove listener', 'clear interval',
      'teardown', 'prevent memory leak'
    ],
    problem: 'Cleaning up active timers, WebSockets, DOM event listeners, and subscriptions on unmount',
    samreyConcept: 'Automatic reactive owner disposal and lifecycle cleanup registration',
    recommendedApi: '@samrey/reactivity -> onCleanup()',
    implementation: `import { signal, onCleanup } from '@samrey/reactivity';
import { el } from '@samrey/runtime';

export function LiveTicker() {
  const price = signal(100);

  const timer = setInterval(() => {
    price.value = +(100 + Math.random() * 10).toFixed(2);
  }, 1000);

  // Automatically executed when component unmounts or parent recomputes
  onCleanup(() => {
    clearInterval(timer);
    console.log('Ticker interval cleared.');
  });

  return el('div', { class: 'font-mono text-lg' },
    () => \`Live Price: $\${price.value}\`
  );
}`,
    howItWorks: 'onCleanup() binds the teardown function to the current reactive owner node. When the owner is disposed or recalculated, all registered cleanup functions execute in reverse order.',
    whenToUse: 'Whenever starting timers (setInterval), connecting WebSockets, or attaching manual global event listeners.',
    alternative: 'Returning a cleanup function directly from an effect(() => () => cleanup())',
    commonMistakes: [
      'Calling onCleanup() inside an asynchronous callback where the reactive owner context has already exited.'
    ],
    relatedApis: ['onCleanup', 'createRoot', 'effect'],
    documentation: [
      { label: 'Reactivity & Control Flow', url: '#reactivity', sourcePath: 'docs/REACTIVITY_AND_CONTROL_FLOW.md' }
    ]
  },

  // 17. Performance
  {
    id: 'recipe-performance',
    category: 'performance',
    categoryLabel: 'Performance & Optimization',
    keywords: [
      'performance', 'untrack', 'batch updates', 'optimize rendering', 'memoization',
      'prevent rerender', 'fine grained'
    ],
    problem: 'Optimizing high-frequency updates, batching multiple signal mutations, and reading signals without subscribing',
    samreyConcept: 'Granular dependency isolation and atomic batch notification dispatch',
    recommendedApi: '@samrey/reactivity -> untrack(), batch()',
    implementation: `import { signal, computed, untrack, batch } from '@samrey/reactivity';

const mouseX = signal(0);
const mouseY = signal(0);
const scrollY = signal(0);

// Reading scrollY without making this computed re-evaluate on scroll events
const pointerStats = computed(() => {
  const currentScroll = untrack(() => scrollY.value);
  return \`Position: (\${mouseX.value}, \${mouseY.value}) @ Scroll: \${currentScroll}\`;
});

// Grouping multiple updates into a single notification tick
export function handleMouseMove(x: number, y: number) {
  batch(() => {
    mouseX.value = x;
    mouseY.value = y;
  });
}`,
    howItWorks: 'untrack() temporarily silences active dependency tracking while executing its getter. batch() suppresses downstream observer notifications until all signal updates inside the batch complete.',
    whenToUse: 'For animations, drag-and-drop, high-frequency telemetry, and breaking unintended reactive loops.',
    alternative: 'createMemo() for caching computationally expensive calculations',
    commonMistakes: [
      'Overusing untrack() on dependencies that genuinely should trigger UI updates.'
    ],
    relatedApis: ['untrack', 'batch', 'computed', 'createMemo'],
    documentation: [
      { label: 'Reactivity Guide', url: '#reactivity', sourcePath: 'docs/REACTIVITY_AND_CONTROL_FLOW.md' }
    ]
  },

  // 18. Testing
  {
    id: 'recipe-testing',
    category: 'testing',
    categoryLabel: 'Testing & Verification',
    keywords: [
      'testing', 'unit test', 'renderTestComponent', 'fireEvent', 'waitFor',
      'test harness', 'assert dom'
    ],
    problem: 'Writing robust unit and integration tests for Samrey components and user interactions',
    samreyConcept: 'Isolated DOM test harness with event simulation and async state settling',
    recommendedApi: '@samrey/testing -> renderTestComponent(), fireEvent, waitFor',
    implementation: `import { renderTestComponent, fireEvent, waitFor } from '@samrey/testing';
import { signal } from '@samrey/reactivity';
import { el } from '@samrey/runtime';

function Counter() {
  const count = signal(0);
  return el('div', null,
    el('span', { id: 'count-val' }, () => \`Count: \${count.value}\`),
    el('button', { id: 'inc-btn', onClick: () => { count.value++; } }, 'Increment')
  );
}

// Unit Test Function
export async function testCounterComponent() {
  const { getById, unmount } = renderTestComponent(() => Counter());

  const btn = getById('inc-btn');
  const display = getById('count-val');

  fireEvent.click(btn);

  await waitFor(() => {
    if (display.textContent !== 'Count: 1') {
      throw new Error(\`Expected Count: 1, got \${display.textContent}\`);
    }
  });

  unmount();
}`,
    howItWorks: 'renderTestComponent() mounts components into an isolated DOM container and provides query helpers. fireEvent dispatches native synthetic events and waitFor polls assertions until microtasks settle.',
    whenToUse: 'For unit testing components, testing forms, and validating router flows.',
    alternative: 'Testing raw signals and computed functions directly without DOM mounting for pure logic',
    commonMistakes: [
      'Forgetting to await waitFor() when testing asynchronous createResource updates.'
    ],
    relatedApis: ['renderTestComponent', 'fireEvent', 'waitFor', 'waitForNextUpdate', 'createMockResource'],
    documentation: [
      { label: 'Testing Specification', url: '#docs', sourcePath: 'docs/PUBLIC_API.md' }
    ]
  },

  // 19. DevTools
  {
    id: 'recipe-devtools',
    category: 'devtools',
    categoryLabel: 'DevTools & Diagnostics',
    keywords: [
      'devtools', 'inspect signals', 'reactive graph', 'performance telemetry',
      'debug component', 'initDevTools'
    ],
    problem: 'Inspecting reactive dependency graph topologies, tracking signal mutations, and profiling render performance',
    samreyConcept: 'Framework runtime instrumentation bridge and graph topology inspector',
    recommendedApi: '@samrey/devtools -> initDevTools(), ReactiveGraphInspector',
    implementation: `import { initDevTools, ReactiveGraphInspector } from '@samrey/devtools';

// Initialize in development mode
if (process.env.NODE_ENV !== 'production') {
  initDevTools({
    trackPerformance: true,
    maxGraphDepth: 10
  });

  // Query reactive graph programmatically
  const graph = new ReactiveGraphInspector();
  console.log('Active Signal Count:', graph.getActiveNodes().length);
}`,
    howItWorks: 'initDevTools() injects a lightweight bridge (window.__SAMREY_DEVTOOLS__) that monitors signal reads/writes and component mounting without degrading production performance.',
    whenToUse: 'During local development, debugging memory leaks, and performance profiling.',
    alternative: 'Built-in DevTools and Architecture visualizers in the Samrey documentation app',
    commonMistakes: [
      'Enabling high-overhead performance telemetry in production builds.'
    ],
    relatedApis: ['initDevTools', 'SamreyDevToolsBridge', 'ReactiveGraphInspector', 'PerfInspector'],
    documentation: [
      { label: 'DevTools Guide', url: '#docs', sourcePath: 'docs/PUBLIC_API.md' }
    ]
  }
];

export const RECIPE_CATEGORY_MAP: Record<RecipeCategory, string> = {
  'component-communication': 'Component Communication',
  'reactive-state': 'Reactive State',
  'dom-manipulation': 'DOM Manipulation',
  'conditional-rendering': 'Conditional Rendering',
  'list-rendering': 'List Rendering',
  'events': 'Events & Interactions',
  'forms': 'Forms & Inputs',
  'validation': 'Schema Validation',
  'http-api': 'HTTP & API Calls',
  'routing': 'Routing & Navigation',
  'ssr': 'Server-Side Rendering',
  'ssg': 'Static Site Generation',
  'security': 'Security & Sanitization',
  'error-handling': 'Error Handling',
  'lifecycle': 'Lifecycle & Mount',
  'cleanup': 'Cleanup & Teardown',
  'performance': 'Performance Optimization',
  'testing': 'Testing & Verification',
  'devtools': 'DevTools & Diagnostics'
};

/**
 * Classifies a user query to identify matching Recipe Category
 */
export function classifyRecipeCategory(query: string): RecipeCategory | null {
  const q = query.toLowerCase().trim();

  // 1. High-priority exact regex pattern rules
  if (/\b(transfer data|between components|props|parent.*child|child.*parent|share state|pass signal|component communication)\b/i.test(q)) {
    return 'component-communication';
  }
  if (/\b(dom element|dom manipulation|create element|el function|bind class|bind style|bind attribute|update dom)\b/i.test(q)) {
    return 'dom-manipulation';
  }
  if (/\b(condition|conditionally|show component|show\(\)|toggle element|switch match|if else)\b/i.test(q)) {
    return 'conditional-rendering';
  }
  if (/\b(list rendering|render.*list|for component|for\(\)|render array|table rendering|keyed list|loop.*item)\b/i.test(q)) {
    return 'list-rendering';
  }
  if (/\b(dom events?|listen.*event|click|oninput|keydown|event listener|handle click)\b/i.test(q)) {
    return 'events';
  }
  if (/\b(validate.*form|schema validation|validation|zod|valibot|field error)\b/i.test(q)) {
    return 'validation';
  }
  if (/\b(createform|createfield|bindfield|form state|bind.*form|forms?)\b/i.test(q)) {
    return 'forms';
  }
  if (/\b(call.*api|fetch data|http|createresource|httpclient|rest api|async data)\b/i.test(q)) {
    return 'http-api';
  }
  if (/\b(rout(e|ing|er)|useparams|userouter|navigation|navigate between|link component)\b/i.test(q)) {
    return 'routing';
  }
  if (/\b(ssr|server side render|rendertostring|rendertostream|hydrate)\b/i.test(q)) {
    return 'ssr';
  }
  if (/\b(ssg|static site|static pages|pre render|generate static)\b/i.test(q)) {
    return 'ssg';
  }
  if (/\b(security|xss|sanitize|csrf|trusted types|prototype pollution)\b/i.test(q)) {
    return 'security';
  }
  if (/\b(error|errorboundary|onerror|aeth|catch.*error|exception)\b/i.test(q)) {
    return 'error-handling';
  }
  if (/\b(lifecycle|onmount|mount|after render)\b/i.test(q)) {
    return 'lifecycle';
  }
  if (/\b(cleanup|oncleanup|dispose|timer|clearinterval|teardown|memory leak)\b/i.test(q)) {
    return 'cleanup';
  }
  if (/\b(performance|untrack|batch|optimize.*reactiv|memoization)\b/i.test(q)) {
    return 'performance';
  }
  if (/\b(test|testing|testharness|rendertestcomponent|fireevent|waitfor|unit test)\b/i.test(q)) {
    return 'testing';
  }
  if (/\b(devtools|debug|graph|inspector|profil(e|er)|time-travel)\b/i.test(q)) {
    return 'devtools';
  }
  if (/\b(signal|computed|derived state|store|reactive state|createstore|batch)\b/i.test(q)) {
    return 'reactive-state';
  }

  // 2. Keyword & phrase score matching
  let bestRecipe: Recipe | null = null;
  let bestScore = 0;

  for (const recipe of RECIPES) {
    let score = 0;
    const catName = recipe.category.replace(/-/g, ' ');
    if (q.includes(catName)) score += 30;
    if (q.includes(recipe.category)) score += 30;

    for (const kw of recipe.keywords) {
      const lowerKw = kw.toLowerCase();
      if (q.includes(lowerKw)) {
        score += lowerKw.length * 3;
      }
    }

    if (score > bestScore) {
      bestScore = score;
      bestRecipe = recipe;
    }
  }

  if (bestRecipe && bestScore >= 15) {
    return bestRecipe.category;
  }

  return null;
}

/**
 * Finds the most relevant recipe for a given user query
 */
export function findRecipeForQuery(query: string): Recipe | null {
  const category = classifyRecipeCategory(query);
  if (!category) return null;
  return RECIPES.find(r => r.category === category) || null;
}

/**
 * Formats a Recipe object into a full AssistantAnswer
 */
export function formatRecipeToAnswer(recipe: Recipe, originalQuery: string): AssistantAnswer {
  return {
    id: `recipe-${recipe.category}`,
    query: originalQuery,
    category: recipe.category,
    title: `${recipe.categoryLabel} Recipe`,
    shortAnswer: `**PROBLEM**: ${recipe.problem}\n\n**SAMREY CONCEPT**: ${recipe.samreyConcept}\n\n**RECOMMENDED API**: \`${recipe.recommendedApi}\``,
    concept: recipe.samreyConcept,
    recommendedApi: recipe.recommendedApi,
    whenToUse: recipe.whenToUse,
    implementationSteps: [
      `Identify the specific problem: ${recipe.problem}.`,
      `Import the authoritative Samrey API: ${recipe.recommendedApi}.`,
      `Implement the reactive pattern using fine-grained signal subscriptions with zero Virtual DOM overhead.`,
      `Verify cleanup and edge case handling.`
    ],
    tsCodeExample: recipe.implementation,
    completeWorkingExample: recipe.implementation,
    codeExplanation: recipe.howItWorks,
    alternativeApproach: recipe.alternative,
    commonMistakes: recipe.commonMistakes,
    relatedApis: recipe.relatedApis,
    docLinks: recipe.documentation,
    sourceFiles: recipe.documentation.map(d => d.sourcePath || 'docs/PUBLIC_API.md'),
    isRecipe: true,
    problem: recipe.problem,
    samreyConcept: recipe.samreyConcept,
    howItWorks: recipe.howItWorks,
    alternative: recipe.alternative,
    isDirectMatch: true,
    isAiGenerated: false,
    provider: 'samrey-recipe-engine-v1.0.0'
  };
}
