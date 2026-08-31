/**
 * @license Apache-2.0
 * @samrey/doc - Authoritative Samrey v1.0.0 Developer Knowledge Base & Retrieval Engine
 *
 * Grounded exclusively on official @samrey/* packages, APIs, error codes (AETH-xxx),
 * and architectural specifications. Adheres strictly to the 12-section answer schema.
 */

export interface KnowledgeItem {
  id: string;
  keywords: string[];
  categories: Array<'reactivity' | 'runtime' | 'forms' | 'router' | 'http' | 'ssr' | 'security' | 'compiler' | 'errors' | 'general' | 'performance' | 'testing' | 'devtools'>;
  title: string;
  shortAnswer: string;
  concept: string;
  recommendedApi: string;
  whenToUse: string;
  implementationSteps: string[];
  tsCodeExample: string;
  completeWorkingExample?: string;
  codeExplanation: string;
  alternativeApproach?: string;
  commonMistakes: string[];
  relatedApis: string[];
  docLinks: Array<{ label: string; url: string }>;
}

export interface AssistantAnswer {
  id: string;
  query: string;
  category: string;
  title: string;
  shortAnswer: string;
  concept: string;
  recommendedApi: string;
  whenToUse: string;
  implementationSteps: string[];
  tsCodeExample: string;
  completeWorkingExample?: string;
  codeExplanation: string;
  alternativeApproach?: string;
  commonMistakes: string[];
  relatedApis: string[];
  docLinks: Array<{ label: string; url: string; sourcePath?: string }>;
  sourceFiles?: string[];
  isAiGenerated?: boolean;
  provider?: string;
  intentType?: string;
  isDirectMatch?: boolean;
  isRecipe?: boolean;
  problem?: string;
  samreyConcept?: string;
  howItWorks?: string;
  alternative?: string;
}

export const POPULAR_PROMPTS = [
  'How do I transfer data between components?',
  'How do I update the DOM reactively?',
  'How do I create a store?',
  'How do I fetch API data?',
  'How do I validate a form?',
  'How do I create a route?',
  'How do I implement SSR?',
  'How do I prevent XSS?',
  'How do I test a component?',
  'How should I structure a Samrey component?'
];

export const CATEGORY_FILTERS = [
  { id: 'all', label: 'All Topics' },
  { id: 'reactivity', label: 'Reactivity Engine' },
  { id: 'runtime', label: 'Runtime & DOM' },
  { id: 'forms', label: 'Forms & Validation' },
  { id: 'router', label: 'Router & Navigation' },
  { id: 'http', label: 'HTTP & Data Fetching' },
  { id: 'ssr', label: 'SSR & Hydration' },
  { id: 'security', label: 'Security & XSS' },
  { id: 'errors', label: 'Error Codes (AETH)' }
];

export const FAQ_ENTRIES: Array<{ question: string; category: string; summary: string }> = [
  {
    question: 'How do I transfer data between components?',
    category: 'reactivity',
    summary: 'Use props for direct parent-child communication, Signals for reactive values, and createContext / useContext for deep subtree dependency injection.'
  },
  {
    question: 'How do I update the DOM reactively?',
    category: 'runtime',
    summary: 'Bind signal functions directly to element properties in el() or use text() nodes. The fine-grained runtime mutates DOM nodes without VDOM diffing.'
  },
  {
    question: 'How do I create a store?',
    category: 'reactivity',
    summary: 'Use createStore() from @samrey/reactivity with deep proxy tracking, produce() for mutations, and reconcile() for structural updates.'
  },
  {
    question: 'How do I fetch API data?',
    category: 'http',
    summary: 'Use createHttpClient() and resource() from @samrey/http to handle declarative data fetching, caching, and reactive loading states.'
  },
  {
    question: 'How do I validate a form?',
    category: 'forms',
    summary: 'Use createForm() and createField() with Standard Schema validators (Zod/Valibot/ArkType), automatic ARIA derivation, and CSRF token handling.'
  },
  {
    question: 'How do I create a route?',
    category: 'router',
    summary: 'Define routes with createRouter() and Router/Route components, and use useParams(), useLocation(), and Link for type-safe navigation.'
  },
  {
    question: 'How do I implement SSR?',
    category: 'ssr',
    summary: 'Use renderToString() or renderToStream() from @samrey/ssr on the server and hydrate() on the client with automated secret stripping.'
  },
  {
    question: 'How do I prevent XSS?',
    category: 'security',
    summary: 'Samrey auto-sanitizes attributes and content at compile time; use sanitizeHtml(), sanitizeUri(), and escapeHtmlText() for dynamic external data.'
  },
  {
    question: 'How do I test a component?',
    category: 'runtime',
    summary: 'Use renderTest() from @samrey/testing to mount components in isolated reactive roots, fireEvent() to trigger interactions, and waitFor() / flushReactivity() to assert state.'
  },
  {
    question: 'How do I handle an AETH error?',
    category: 'errors',
    summary: 'Identify the deterministic error code (e.g. AETH-101 to AETH-899), examine the actionable explanation, and apply the recommended syntax or architectural fix.'
  },
  {
    question: 'How do I create a reusable component?',
    category: 'runtime',
    summary: 'Write a pure TypeScript function accepting typed props and returning native DOM elements via el(), Show, and For primitives.'
  }
];

export const KNOWLEDGE_BASE: KnowledgeItem[] = [
  // 1. Data Transfer Between Components
  {
    id: 'component-data-transfer',
    keywords: ['transfer data', 'props', 'context', 'between components', 'parent child', 'pass data', 'share state', 'prop drilling'],
    categories: ['reactivity', 'runtime'],
    title: 'Data Transfer & Communication Between Components',
    shortAnswer: 'Transfer data in Samrey using typed Props for direct parent-to-child data flow, reactive Signals for two-way synchronization, and createContext / useContext for deep dependency injection across the component tree.',
    concept: 'In Samrey, component functions execute ONCE during instantiation to construct the reactive ownership tree. Data transfer does not rely on repeated component re-renders. Instead, signals or store references are passed directly through props or Context, and child DOM nodes subscribe directly to fine-grained changes.',
    recommendedApi: 'createContext<T>() and useContext<T>() from @samrey/reactivity for cross-tree state, and typed function props with Signal<T> for direct hierarchical flow.',
    whenToUse: 'Use direct Props when passing data down 1–2 component levels. Use createContext/useContext when sharing state across deeply nested components (such as current user session, theme, or active cart) without prop drilling.',
    implementationSteps: [
      'Define a strongly-typed Context using `createContext<T>(defaultValue)` at module scope.',
      'Wrap parent subtree elements with the context Provider: `MyContext.Provider({ value, children })`.',
      'Consume the context value in any descendant component using `useContext(MyContext)`.',
      'For direct parent-child communication, pass a `Signal<T>` or callback function via props.'
    ],
    tsCodeExample: `import { el } from '@samrey/runtime';
import { signal, Signal, createContext, useContext } from '@samrey/reactivity';

// 1. Define Context for deeply nested state
interface UserSession {
  username: Signal<string>;
  role: Signal<'admin' | 'user'>;
}

export const SessionContext = createContext<UserSession>();

// 2. Parent Component providing data
export function AppShell(): HTMLElement {
  const username = signal('Alex');
  const role = signal<'admin' | 'user'>('admin');

  return SessionContext.Provider({
    value: { username, role },
    children: el('div', { class: 'shell' },
      UserProfileHeader({ title: 'Dashboard' }),
      MainContent()
    )
  });
}

// 3. Child Component receiving direct Props
export function UserProfileHeader(props: { title: string }): HTMLElement {
  return el('header', { class: 'header' },
    el('h1', null, props.title)
  );
}

// 4. Deep Descendant Component consuming Context
export function MainContent(): HTMLElement {
  const session = useContext(SessionContext);

  return el('main', { class: 'p-4' },
    el('p', null, () => \`Logged in as: \${session?.username.value} (\${session?.role.value})\`),
    el('button', {
      onClick: () => session?.username.set('Jordan')
    }, 'Switch User')
  );
}`,
    completeWorkingExample: `import { el, mount } from '@samrey/runtime';
import { signal, createContext, useContext } from '@samrey/reactivity';

const CountContext = createContext<{ count: ReturnType<typeof signal<number>> }>();

function CounterDisplay(): HTMLElement {
  const ctx = useContext(CountContext);
  return el('div', { class: 'text-lg font-mono' },
    () => \`Current Count: \${ctx?.count.value}\`
  );
}

function CounterControls(): HTMLElement {
  const ctx = useContext(CountContext);
  return el('button', {
    class: 'px-4 py-2 bg-indigo-600 text-white rounded-lg',
    onClick: () => ctx?.count.set(c => c + 1)
  }, 'Increment via Context');
}

export function RootApp(): HTMLElement {
  const count = signal(0);
  return CountContext.Provider({
    value: { count },
    children: el('div', { class: 'p-6 space-y-4' },
      CounterDisplay(),
      CounterControls()
    )
  });
}`,
    codeExplanation: 'The SessionContext is created once. The parent wraps child nodes with Provider, binding the context map to the active reactive Owner scope. Descendants retrieve the context via `useContext()`. Because `username` is a reactive `Signal`, updating `session.username.set(...)` triggers surgical updates on only the DOM text nodes that read `username.value`.',
    alternativeApproach: 'For centralized application-wide state management, you can alternatively use `createStore()` from `@samrey/reactivity` in a dedicated store module and import it directly into components.',
    commonMistakes: [
      'Destructuring signal values into primitive numbers/strings in the component body (e.g. `const { value } = count`), which loses reactivity.',
      'Calling `useContext()` outside of an active reactive owner or outside of the Provider subtree.',
      'Re-instantiating component functions on every state change instead of updating reactive signal values.'
    ],
    relatedApis: ['createContext', 'useContext', 'signal', 'createStore', 'getOwner', 'runWithOwner'],
    docLinks: [
      { label: 'Reactivity & Control Flow', url: '#reactivity' },
      { label: 'Architecture & Packages', url: '#architecture' },
      { label: 'Public API Specification', url: '#docs' }
    ]
  },

  // 2. DOM Updates on Signal Changes
  {
    id: 'dom-updates-signal',
    keywords: ['update the dom reactively', 'update dom reactively', 'update dom', 'signal changes', 'dom element', 'reactive binding', 'el', 'fine-grained', 'mutate dom', 'text node', 'reactive dom'],
    categories: ['runtime', 'reactivity'],
    title: 'Updating DOM Elements When a Signal Changes',
    shortAnswer: 'In Samrey, pass reactive getter functions `() => signal.value` directly as attributes, class names, or child elements in `el()`. The runtime registers surgical subscribers that update only the specific DOM attribute or text node when the signal changes.',
    concept: 'Unlike Virtual DOM frameworks that re-render entire component trees and compute diffs, Samrey components run ONCE. When a signal is read inside a function passed to `el()` (e.g. `() => count.value`), Samrey creates a fine-grained `effect` attached to the element. When the signal emits, only the exact DOM property is updated in O(1) time.',
    recommendedApi: '`el(tag, props, ...children)` and `text(content)` from `@samrey/runtime` with `signal()` from `@samrey/reactivity`.',
    whenToUse: 'Use for all interactive UI elements where attributes, classes, styles, text, or child nodes depend on reactive state.',
    implementationSteps: [
      'Create a reactive signal using `signal(initialValue)`.',
      'Create DOM elements using `el(tag, props, ...children)`.',
      'For dynamic attributes or text, supply an accessor function `() => signal.value`.',
      'Attach event handlers like `onClick` to update the signal value via `signal.set(newVal)`.'
    ],
    tsCodeExample: `import { el } from '@samrey/runtime';
import { signal } from '@samrey/reactivity';

export function DynamicCounter(): HTMLElement {
  const count = signal(0);

  return el('div', { class: 'p-6 max-w-sm mx-auto bg-white rounded-xl shadow-md space-y-4' },
    // Dynamic text binding via accessor function
    el('h2', { class: 'text-xl font-bold text-slate-800' },
      () => \`Count is: \${count.value}\`
    ),

    // Dynamic class binding based on signal value
    el('div', {
      class: () => count.value % 2 === 0
        ? 'p-2 bg-emerald-100 text-emerald-800 rounded font-mono'
        : 'p-2 bg-amber-100 text-amber-800 rounded font-mono'
    },
      () => count.value % 2 === 0 ? 'Status: EVEN' : 'Status: ODD'
    ),

    // Interactive button updating signal
    el('button', {
      class: 'px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition',
      onClick: () => count.set(c => c + 1)
    }, 'Increment')
  );
}`,
    codeExplanation: 'When `DynamicCounter()` is called, the `div`, `h2`, and `button` are created in the browser DOM once. The functions `() => \`Count is: \${count.value}\`` and `() => count.value % 2 === 0` are wrapped in fine-grained DOM subscribers. When `count.set()` is invoked, only the text node and class attribute are mutated; zero parent elements or subtrees are re-evaluated.',
    alternativeApproach: 'You can also use explicit `text(() => signal.value)` nodes or the declarative `<Show>` and `<For>` control flow primitives for conditional and list structures.',
    commonMistakes: [
      'Passing static strings instead of functions to dynamic attributes (e.g. `class: count.value > 0 ? "a" : "b"`), which evaluates only once at mount.',
      'Using manual `document.getElementById` and `innerHTML` instead of native Samrey signal bindings.',
      'Creating new signal instances inside reactive getter functions.'
    ],
    relatedApis: ['el', 'text', 'Show', 'For', 'signal', 'computed', 'effect'],
    docLinks: [
      { label: 'Reactivity Engine Visualizer', url: '#reactivity' },
      { label: 'Runtime & DOM Primitives', url: '#architecture' }
    ]
  },

  // 3. Creating a Reactive Store
  {
    id: 'reactive-store',
    keywords: ['create a store', 'create store', 'create a reactive store', 'reactive store', 'createStore', 'produce', 'reconcile', 'global state', 'store', 'deep reactivity', 'state management'],
    categories: ['reactivity'],
    title: 'Creating and Managing Reactive Stores',
    shortAnswer: 'Use `createStore<T>(initialState)` from `@samrey/reactivity` to create deep proxy-backed reactive stores with fine-grained path tracking, `produce()` for mutable draft updates, and `reconcile()` for structural merging.',
    concept: 'While `signal()` manages individual primitive values, `createStore()` wraps objects and arrays in nested ES Proxies. Reading a nested property like `store.user.preferences.theme` subscribes only to changes on that specific property path. Updating `store.user.preferences.theme` will not trigger re-renders on components reading `store.user.name`.',
    recommendedApi: '`createStore<T>()`, `produce()`, and `reconcile()` from `@samrey/reactivity`.',
    whenToUse: 'Use `createStore()` for complex nested data structures, lists of domain objects, application-wide global settings, or state trees requiring granular updates.',
    implementationSteps: [
      'Define the TypeScript interface for your store state.',
      'Initialize the store with `const [state, setState] = createStore<T>(initialData)`.',
      'Read properties directly in components using accessor functions: `() => state.user.name`.',
      'Update nested state surgically using path setters `setState("user", "name", "New Name")` or `produce()`.',
      'Merge remote API responses using `reconcile()`, preserving unchanged object identities.'
    ],
    tsCodeExample: `import { el, For } from '@samrey/runtime';
import { createStore, produce, reconcile } from '@samrey/reactivity';

interface Task {
  id: string;
  title: string;
  completed: boolean;
}

interface AppState {
  tasks: Task[];
  filter: 'all' | 'active' | 'completed';
}

// 1. Initialize deep reactive store
export const [appStore, setAppStore] = createStore<AppState>({
  tasks: [
    { id: '1', title: 'Adopt Samrey Framework', completed: true },
    { id: '2', title: 'Build Zero-Eval App', completed: false }
  ],
  filter: 'all'
});

// 2. Store mutation helpers
export function addTask(title: string) {
  setAppStore('tasks', produce(tasks => {
    tasks.push({ id: String(Date.now()), title, completed: false });
  }));
}

export function toggleTask(id: string) {
  setAppStore('tasks', produce(tasks => {
    const task = tasks.find(t => t.id === id);
    if (task) task.completed = !task.completed;
  }));
}

// 3. UI Component subscribing to granular store properties
export function TaskList(): HTMLElement {
  return el('div', { class: 'space-y-3' },
    For({
      each: () => appStore.tasks,
      key: (task) => task.id,
      children: (task) => el('div', { class: 'flex items-center space-x-2' },
        el('input', {
          type: 'checkbox',
          checked: () => task.completed,
          onChange: () => toggleTask(task.id)
        }),
        el('span', {
          class: () => task.completed ? 'line-through text-slate-400' : 'text-slate-900'
        }, () => task.title)
      )
    })
  );
}`,
    codeExplanation: '`createStore` wraps `AppState` in fine-grained proxy nodes. In `TaskList`, `<For>` keys each task by its ID and only reconciles items when the list changes. Clicking the checkbox modifies only that task’s `completed` boolean property, notifying only the checkbox and span for that specific row.',
    alternativeApproach: 'For simple independent state variables, multiple individual `signal()` instances can be combined with `computed()` signals.',
    commonMistakes: [
      'Mutating `appStore.tasks[0].completed = true` directly without using `setAppStore` or `produce` (direct assignment bypasses proxy change notifications).',
      'Over-reconciling entire lists without specifying a unique key function in `<For>`.',
      'Using external state libraries like Redux or Zustand, which introduce unnecessary bundle bloat and VDOM patterns.'
    ],
    relatedApis: ['createStore', 'produce', 'reconcile', 'batch', 'signal', 'computed'],
    docLinks: [
      { label: 'Reactivity Engine Guide', url: '#reactivity' },
      { label: 'Public API Reference', url: '#docs' }
    ]
  },

  // 4. API Calls & HTTP Data Fetching
  {
    id: 'api-data-fetching',
    keywords: ['fetch api data', 'fetch data', 'api data', 'call an api', 'http client', 'resource', 'createHttpClient', 'data fetching', 'async resource', 'cache'],
    categories: ['http', 'reactivity', 'runtime'],
    title: 'Calling APIs and Managing Asynchronous Resources',
    shortAnswer: 'Use `createHttpClient()` and `resource()` from `@samrey/http` for declarative async data fetching, automatic caching, error handling, and reactive loading states.',
    concept: '`resource()` converts an asynchronous fetch function into a reactive object providing signals for `data`, `loading`, `error`, and `refetch()`. It integrates directly with Samrey’s reactive owner tree, automatically cleaning up aborted requests when components unmount.',
    recommendedApi: '`createHttpClient(config)` and `resource(fetcher)` from `@samrey/http`.',
    whenToUse: 'Use for all REST, GraphQL, or JSON API interactions, server requests, and asynchronous data dependencies in client-side or SSR applications.',
    implementationSteps: [
      'Create an HTTP client instance using `createHttpClient({ baseUrl, headers })`.',
      'Define a reactive resource using `resource(() => http.get<T>(endpoint))`.',
      'Bind `resource.loading`, `resource.error`, and `resource.data` to UI elements using `<Show>`.',
      'Trigger manual revalidation by calling `resource.refetch()`.'
    ],
    tsCodeExample: `import { el, Show, For } from '@samrey/runtime';
import { createHttpClient, resource } from '@samrey/http';

interface Project {
  id: string;
  name: string;
  stars: number;
}

// 1. Initialize configured HTTP client with interceptors
export const api = createHttpClient({
  baseUrl: 'https://api.example.com/v1',
  timeout: 8000,
  headers: {
    'Accept': 'application/json'
  }
});

// 2. Component fetching projects
export function ProjectExplorer(): HTMLElement {
  // Reactive resource automatically executes on mount
  const projectsResource = resource(async () => {
    return api.get<Project[]>('/projects');
  });

  return el('div', { class: 'p-6 max-w-2xl mx-auto space-y-4' },
    el('div', { class: 'flex justify-between items-center' },
      el('h2', { class: 'text-2xl font-bold' }, 'Projects'),
      el('button', {
        class: 'px-3 py-1.5 bg-slate-900 text-white rounded-lg text-sm hover:bg-slate-800',
        onClick: () => projectsResource.refetch()
      }, 'Refresh')
    ),

    // Loading State
    Show({
      when: () => projectsResource.loading.value,
      children: () => el('div', { class: 'p-4 text-slate-500 animate-pulse' }, 'Loading projects from API...')
    }),

    // Error State
    Show({
      when: () => !!projectsResource.error.value,
      children: () => el('div', { class: 'p-4 bg-rose-50 text-rose-700 rounded-lg' },
        () => \`Error fetching data: \${projectsResource.error.value?.message}\`
      )
    }),

    // Success State
    Show({
      when: () => !projectsResource.loading.value && !projectsResource.error.value && !!projectsResource.data.value,
      children: () => el('ul', { class: 'divide-y divide-slate-200 bg-white rounded-xl border border-slate-200' },
        For({
          each: () => projectsResource.data.value || [],
          key: (p) => p.id,
          children: (project) => el('li', { class: 'p-4 flex justify-between' },
            el('span', { class: 'font-medium' }, project.name),
            el('span', { class: 'text-slate-500 font-mono text-sm' }, () => \`★ \${project.stars}\`)
          )
        })
      )
    })
  );
}`,
    codeExplanation: '`createHttpClient` handles base URLs, authorization headers, timeout abort controllers, and JSON response parsing. `resource()` tracks the promise lifecycle, exposing reactive signals for `loading`, `error`, and `data`. When `projectsResource.refetch()` is called, loading transitions back to `true` and the UI seamlessly updates.',
    alternativeApproach: 'For simple single-fire calls in response to user actions (like form submissions), invoke `api.post(...)` or `api.put(...)` directly inside event handlers.',
    commonMistakes: [
      'Calling async `fetch` directly in component bodies without tracking reactive loading/error states.',
      'Forgetting to handle error cases, leading to unhandled promise rejections in UI flows.',
      'Hardcoding API secrets or authorization tokens into client-side bundles.'
    ],
    relatedApis: ['createHttpClient', 'resource', 'createCache', 'fetchResource', 'Show', 'For'],
    docLinks: [
      { label: 'Router & HTTP Guide', url: '#architecture' },
      { label: 'Public API Reference', url: '#docs' }
    ]
  },

  // 5. Form Management & Standard Schema Validation
  {
    id: 'form-validation',
    keywords: ['validate form', 'forms', 'createForm', 'createField', 'standard schema', 'zod', 'valibot', 'validation', 'aria'],
    categories: ['forms', 'security', 'runtime'],
    title: 'Form Handling & Standard Schema Validation',
    shortAnswer: 'Use `createForm()` and `createField()` from `@samrey/forms` with Standard Schema (Zod/Valibot/ArkType) validators. Samrey automatically derives `aria-invalid`, `aria-describedby`, touch states, and CSRF protection.',
    concept: 'Samrey forms are schema-driven and accessible by default. Instead of manually synchronizing input values, error messages, and ARIA attributes, `@samrey/forms` manages bidirectional signal bindings, tracks field dirtiness/touch states, validates against standard schema contracts, and attaches accessible ARIA attributes automatically.',
    recommendedApi: '`createForm(config)` and `createField(config)` from `@samrey/forms` with `standardSchemaValidator()`.',
    whenToUse: 'Use for all user inputs, login/registration forms, complex data editors, and multi-step validation flows.',
    implementationSteps: [
      'Define a validation schema using any Standard Schema library (e.g. Zod, Valibot, or custom schema).',
      'Instantiate the form with `createForm({ schema, initialValues, onSubmit })`.',
      'Create fields with `form.field(fieldName)`.',
      'Bind fields to DOM `<input>` elements using `field.bind()`.',
      'Display error messages conditionally using `field.error` signal.'
    ],
    tsCodeExample: `import { el, Show } from '@samrey/runtime';
import { createForm, createField } from '@samrey/forms';

interface UserRegistration {
  email: string;
  age: number;
}

// 1. Standard Schema compliant validator
const registrationSchema = {
  '~standard': {
    version: 1,
    vendor: 'custom',
    validate(value: unknown) {
      const data = value as Record<string, any>;
      const issues: any[] = [];
      if (!data?.email || !data.email.includes('@')) {
        issues.push({ path: ['email'], message: 'Valid email address is required.' });
      }
      if (!data?.age || Number(data.age) < 18) {
        issues.push({ path: ['age'], message: 'Must be at least 18 years of age.' });
      }
      if (issues.length > 0) return { issues };
      return { value: data };
    }
  }
};

export function RegistrationForm(): HTMLElement {
  // 2. Initialize schema-driven form
  const form = createForm<UserRegistration>({
    schema: registrationSchema,
    initialValues: { email: '', age: 18 },
    onSubmit: async (values) => {
      console.log('Valid submission:', values);
    }
  });

  const emailField = form.field('email');
  const ageField = form.field('age');

  return el('form', {
    class: 'p-6 max-w-md mx-auto bg-white rounded-2xl shadow-sm border border-slate-200 space-y-4',
    onSubmit: form.handleSubmit
  },
    el('h3', { class: 'text-lg font-bold text-slate-900' }, 'Create Account'),

    // Email Field
    el('div', { class: 'space-y-1' },
      el('label', { for: 'email-input', class: 'block text-xs font-semibold uppercase text-slate-600' }, 'Email Address'),
      el('input', {
        id: 'email-input',
        type: 'email',
        class: 'w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-slate-900',
        value: () => emailField.value.value,
        onInput: (e: Event) => emailField.value.set((e.target as HTMLInputElement).value),
        onBlur: () => emailField.touched.set(true)
      }),
      Show({
        when: () => emailField.touched.value && !!emailField.error.value,
        children: () => el('p', { class: 'text-xs text-rose-600 font-medium' }, () => emailField.error.value)
      })
    ),

    // Submit Button
    el('button', {
      type: 'submit',
      disabled: () => form.isSubmitting.value || (!form.isValid.value && form.isSubmitted.value),
      class: 'w-full py-2.5 bg-slate-900 text-white font-medium rounded-lg hover:bg-slate-800 transition disabled:opacity-50'
    },
      () => form.isSubmitting.value ? 'Submitting...' : 'Register'
    )
  );
}`,
    codeExplanation: '`createForm` handles synchronous and asynchronous schema validation across all registered fields. When the user interacts with an input, `emailField.touched` and `emailField.value` signals update. If validation fails, `emailField.error` receives the descriptive error message, triggering `<Show>` to render accessible error feedback.',
    alternativeApproach: 'For single input fields, you can use standalone `createField()` without a full form wrapper.',
    commonMistakes: [
      'Mutating field values directly without emitting change events or updating the field signal.',
      'Displaying error messages before the user has touched the field (`touched === false`), resulting in jarring initial error states.',
      'Manual regex validation instead of declarative schema contracts.'
    ],
    relatedApis: ['createForm', 'createField', 'standardSchemaValidator', 'deriveAriaAttributes'],
    docLinks: [
      { label: 'Forms & Validation Specification', url: '#architecture' },
      { label: 'Public API Reference', url: '#docs' }
    ]
  },

  // 6. Routing & Navigation
  {
    id: 'routing-navigation',
    keywords: ['create a route', 'router', 'navigation', 'createRouter', 'Route', 'Link', 'useParams', 'useLocation', 'nested routes'],
    categories: ['router', 'runtime'],
    title: 'Configuring Routes & Type-Safe Navigation',
    shortAnswer: 'Use `createRouter()` and the `<Router>`, `<Route>`, and `<Link>` components from `@samrey/router` for declarative path matching, route parameters (`useParams`), query strings, and nested layouts.',
    concept: 'Samrey’s router uses fine-grained signal-based route matching. Navigating between routes does not reload the page or redraw static ancestor layouts. Only the route outlet container matching the active path expression is mounted or unmounted.',
    recommendedApi: '`createRouter(routes)` along with `Router`, `Route`, `Link`, `useRouter`, `useParams`, and `useNavigate` from `@samrey/router`.',
    whenToUse: 'Use for Single-Page Applications (SPAs) and SSR multi-view apps requiring deep linking, URL history synchronization, dynamic path parameters, and route guards.',
    implementationSteps: [
      'Define route definitions with paths and component factories.',
      'Instantiate the router with `createRouter({ routes, mode: "history" | "hash" })`.',
      'Render the top-level `<Router>` component with `<Route>` declarations.',
      'Use `<Link href="...">` for client-side navigation without full browser refresh.',
      'Extract dynamic URL parameters inside route views using `useParams()`.'
    ],
    tsCodeExample: `import { el } from '@samrey/runtime';
import { createRouter, Router, Route, Link, useParams, useNavigate } from '@samrey/router';

// 1. Define Page Components
function HomePage(): HTMLElement {
  return el('div', { class: 'p-6' },
    el('h2', { class: 'text-2xl font-bold' }, 'Welcome to Samrey v1.0.0'),
    Link({ href: '/users/42', class: 'text-indigo-600 hover:underline' }, 'View User Profile 42')
  );
}

function UserDetailPage(): HTMLElement {
  const params = useParams(); // Reactive params signal
  const navigate = useNavigate();

  return el('div', { class: 'p-6 space-y-4' },
    el('h2', { class: 'text-xl font-bold' },
      () => \`User Profile ID: \${params.value.id}\`
    ),
    el('button', {
      class: 'px-4 py-2 bg-slate-200 rounded hover:bg-slate-300',
      onClick: () => navigate('/users')
    }, 'Back to Users')
  );
}

// 2. Main Router Component
export function AppRouter(): HTMLElement {
  const router = createRouter({
    routes: [
      { path: '/', component: HomePage },
      { path: '/users/:id', component: UserDetailPage }
    ]
  });

  return el('div', { class: 'min-h-screen' },
    el('nav', { class: 'p-4 border-b bg-white flex space-x-4' },
      Link({ href: '/', class: 'font-semibold text-slate-800' }, 'Home'),
      Link({ href: '/users/100', class: 'text-slate-600' }, 'Demo User')
    ),
    Router({
      router,
      children: [
        Route({ path: '/', component: HomePage }),
        Route({ path: '/users/:id', component: UserDetailPage })
      ]
    })
  );
}`,
    codeExplanation: '`createRouter` intercepts pushState / popstate events. When a `<Link>` is clicked, `router.navigate()` updates the active path signal. `useParams()` returns a reactive signal containing parsed parameters like `id: "42"`. The matching `<Route>` instantiates its component directly into the DOM.',
    alternativeApproach: 'For simple tab-based applications or embedded documentation tools, you can alternatively use lightweight hash-based signal state (`window.location.hash`).',
    commonMistakes: [
      'Using standard `<a href="...">` anchor tags without preventDefault, which triggers a full browser page reload instead of client-side routing.',
      'Extracting `params` once without reading it reactively, causing stale parameters when navigating between `/users/1` and `/users/2`.',
      'Using external routers like react-router or vue-router, which depend on foreign reconcilers.'
    ],
    relatedApis: ['createRouter', 'Router', 'Route', 'Link', 'useRouter', 'useParams', 'useNavigate'],
    docLinks: [
      { label: 'Router & HTTP Guide', url: '#architecture' },
      { label: 'Public API Specification', url: '#docs' }
    ]
  },

  // 7. Server-Side Rendering (SSR) & Hydration
  {
    id: 'ssr-hydration',
    keywords: ['implement ssr', 'ssr', 'server side rendering', 'hydration', 'renderToString', 'renderToStream', 'hydrate', 'streaming ssr'],
    categories: ['ssr', 'runtime'],
    title: 'Implementing Server-Side Rendering (SSR) & Hydration',
    shortAnswer: 'Use `renderToString()` or `renderToStream()` from `@samrey/ssr` on the server to produce static HTML with serialized state tokens, and `hydrate()` from `@samrey/runtime` on the client for zero-redraw resumable hydration.',
    concept: 'Samrey SSR renders components into HTML strings or ReadableStreams while collecting serialized state payloads. Crucially, `@samrey/ssr` automatically enforces security scrubbing (stripping secret keys like API tokens and passwords). On the client, `hydrate()` traverses existing DOM nodes to attach reactive signal bindings without reconstructing the DOM tree.',
    recommendedApi: '`renderToString()` / `renderToStream()` from `@samrey/ssr` on Node.js/Bun servers, and `hydrate()` from `@samrey/runtime` in browser entry points.',
    whenToUse: 'Use when building high-performance, SEO-critical applications, fast First Contentful Paint (FCP) experiences, or streaming dynamic server content.',
    implementationSteps: [
      'On Server: Call `await renderToString(() => App())` to generate HTML.',
      'Serialize initial server state using `serializeState(initialData)`.',
      'Inject the rendered HTML and state script tag into your HTML document shell.',
      'On Client: Call `hydrate(() => App(), document.getElementById("root"))` to activate reactive signal bindings.'
    ],
    tsCodeExample: `// --- SERVER (server.ts) ---
import { renderToString, serializeState } from '@samrey/ssr';
import { App } from './src/App.js';

export async function handleRequest(req: any): Promise<string> {
  const initialData = { user: 'DevLeader', timestamp: Date.now() };

  // Render component tree to static HTML string
  const appHtml = await renderToString(() => App());

  // Securely serialize state (auto-strips passwords and private keys)
  const stateJson = serializeState(initialData);

  return \`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>Samrey SSR App</title>
</head>
<body>
  <div id="root">\${appHtml}</div>
  <script id="__SAMREY_STATE__" type="application/json">\${stateJson}</script>
  <script type="module" src="/src/main.ts"></script>
</body>
</html>\`;
}

// --- CLIENT (src/main.ts) ---
import { hydrate } from '@samrey/runtime';
import { App } from './App.js';

const rootContainer = document.getElementById('root')!;
// Resume client reactivity without re-creating DOM elements
hydrate(() => App(), rootContainer);`,
    codeExplanation: '`renderToString` walks the component hierarchy in SSR context, emitting sanitized HTML markup. `serializeState` escapes characters (`<`, `>`, `&`, `\u2028`, `\u2029`) to prevent `<script>` breakout attacks. On the client, `hydrate` resumes listeners and signal subscriptions against the pre-existing DOM nodes.',
    alternativeApproach: 'For large datasets or progressive response delivery, use `renderToStream()` to pipe HTML chunks via HTTP chunked transfer encoding as asynchronous data resolves.',
    commonMistakes: [
      'Accessing `window`, `document`, or `navigator` at module scope or in component bodies during SSR execution.',
      'Using `mount()` instead of `hydrate()` on pre-rendered server markup, causing duplicate DOM element instantiation and flicker.',
      'Including un-sanitized sensitive credentials in server state payloads.'
    ],
    relatedApis: ['renderToString', 'renderToStream', 'hydrate', 'createSsrContext', 'serializeState', 'hydrateState'],
    docLinks: [
      { label: 'SSR & Hydration Specification', url: '#architecture' },
      { label: 'Security Model & Secret Guard', url: '#security' }
    ]
  },

  // 8. Preventing XSS & Security Model
  {
    id: 'security-xss-prevention',
    keywords: ['prevent xss', 'xss', 'security', 'sanitizeHtml', 'sanitizeUri', 'escapeHtmlText', 'csrf', 'trusted types', 'zero eval'],
    categories: ['security', 'compiler'],
    title: 'Preventing XSS, Injection Attacks, and Securing Applications',
    shortAnswer: 'Samrey enforces zero-eval execution and automatic compile-time escaping by default. For dynamic HTML or external URLs, use `sanitizeHtml()`, `sanitizeUri()`, and `createCsrfToken()` from `@samrey/security`.',
    concept: 'Samrey implements a multi-layer security architecture: (1) Zero-eval runtime (no `eval()` or `new Function()`), (2) Compile-time context-aware HTML escaping, (3) Protocol validation on all `href`/`src` attributes blocking `javascript:` and `data:`, (4) Prototype pollution immunity via safe JSON parsing, and (5) Built-in CSRF token lifecycle management.',
    recommendedApi: '`sanitizeHtml(html, options)`, `sanitizeUri(uri)`, `escapeHtmlText(text)`, and `createCsrfToken()` from `@samrey/security`.',
    whenToUse: 'Use when displaying user-generated markdown/HTML content, handling external hyperlinks, processing user inputs, or securing state transitions against CSRF.',
    implementationSteps: [
      'For external user-generated HTML, always pass it through `sanitizeHtml(rawContent)`.',
      'For dynamic hyperlinks or image URLs, validate with `sanitizeUri(url)`.',
      'For form submissions, generate and validate tokens with `createCsrfToken()` and `validateCsrfToken()`.',
      'Ensure Content Security Policy (CSP) headers disallow `unsafe-eval` and `unsafe-inline`.'
    ],
    tsCodeExample: `import { el } from '@samrey/runtime';
import { sanitizeHtml, sanitizeUri, createCsrfToken, validateCsrfToken } from '@samrey/security';

export function SafeUserComment(props: { author: string; rawCommentHtml: string; userUrl: string }): HTMLElement {
  // 1. Sanitize untrusted external HTML (strips <script>, <iframe>, event handlers)
  const cleanHtml = sanitizeHtml(props.rawCommentHtml, {
    allowedTags: ['p', 'b', 'i', 'em', 'strong', 'code', 'pre', 'ul', 'li', 'a']
  });

  // 2. Sanitize user profile URL (blocks 'javascript:alert(1)')
  const safeProfileUrl = sanitizeUri(props.userUrl);

  // 3. Generate CSRF token for interaction actions
  const csrfToken = createCsrfToken('comment-action');

  return el('div', { class: 'p-4 bg-white rounded-xl border border-slate-200 space-y-2' },
    el('div', { class: 'flex items-center justify-between text-xs text-slate-500' },
      el('a', {
        href: safeProfileUrl,
        target: '_blank',
        rel: 'noopener noreferrer',
        class: 'font-semibold text-slate-800 hover:underline'
      }, props.author),
      el('span', null, 'Verified Comment')
    ),

    // Injected sanitized HTML content
    el('div', { class: 'text-sm text-slate-700 leading-relaxed', innerHTML: cleanHtml }),

    // Hidden CSRF token field for subsequent requests
    el('input', { type: 'hidden', name: '_csrf', value: csrfToken })
  );
}`,
    codeExplanation: '`sanitizeHtml` parses the string into safe tokens, stripping dangerous tags (`<script>`, `<iframe>`, `<object>`) and malicious event attributes (`onerror=`, `onload=`). `sanitizeUri` verifies the protocol against an allowlist (`http:`, `https:`, `mailto:`), replacing dangerous schemes like `javascript:` with `about:blank`.',
    alternativeApproach: 'Whenever possible, render plain text via `el("p", null, text)` or `text(content)` instead of injecting raw HTML.',
    commonMistakes: [
      'Assigning unsanitized user strings directly to `element.innerHTML` or `dangerouslySetInnerHTML`.',
      'Permitting `javascript:` protocol URLs in `<a href>` attributes.',
      'Using `eval()` or dynamic `new Function()` for string template evaluation.'
    ],
    relatedApis: ['sanitizeHtml', 'sanitizeUri', 'escapeHtmlText', 'createCsrfToken', 'validateCsrfToken', 'stripSecrets'],
    docLinks: [
      { label: 'Security Model & Zero-Eval Policy', url: '#security' },
      { label: 'Public API Security Contract', url: '#docs' }
    ]
  },

  // 9. Handling AETH Diagnostic Errors
  {
    id: 'handling-aeth-errors',
    keywords: ['handle an aeth error', 'aeth error', 'error codes', 'aeth-101', 'aeth-201', 'aeth-301', 'diagnostic', 'troubleshoot'],
    categories: ['errors'],
    title: 'Diagnosing and Handling AETH Errors',
    shortAnswer: 'Samrey provides deterministic error codes formatted as `AETH-xxx` across 8 subsystem ranges. Locate the specific error code in the Diagnostic Reference, check the source location frame, and apply the standardized recovery pattern.',
    concept: 'Every runtime, compiler, security, and router exception in Samrey is tagged with an immutable code `[AETH-xxx]`. Ranges: `001–099` (CLI), `101–199` (Compiler), `201–299` (Security), `301–399` (Reactivity/Runtime), `401–499` (Router), `501–599` (Forms), `601–699` (HTTP), `701–799` (SSR), `801–899` (DevTools/Testing).',
    recommendedApi: '`ErrorBoundary` and `onError(fn)` from `@samrey/runtime` for runtime exceptions, and the compiler diagnostic logger for AOT build errors.',
    whenToUse: 'Use during build or runtime troubleshooting whenever an `AETH-xxx` exception is logged in the terminal or browser console.',
    implementationSteps: [
      'Read the error code from the console (e.g. `[AETH-301] Circular reactive dependency detected`).',
      'Wrap volatile UI component subtrees in `<ErrorBoundary>` to catch runtime errors gracefully.',
      'For compiler errors (like `AETH-101` or `AETH-103`), inspect the indicated file and line frame.',
      'Apply the recommended fix from the error catalog.'
    ],
    tsCodeExample: `import { el, ErrorBoundary, onError } from '@samrey/runtime';
import { signal } from '@samrey/reactivity';

export function SafeFeatureContainer(): HTMLElement {
  // Register component-level error listener
  onError((err) => {
    console.error('Caught error in component subtree:', err);
  });

  return el('div', { class: 'p-6' },
    ErrorBoundary({
      fallback: (err) => el('div', { class: 'p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-800' },
        el('h4', { class: 'font-bold' }, 'Feature Temporarily Unavailable'),
        el('p', { class: 'text-sm font-mono mt-1' }, String(err)),
        el('button', {
          class: 'mt-3 px-3 py-1.5 bg-rose-700 text-white rounded text-xs font-semibold',
          onClick: () => window.location.reload()
        }, 'Reload Application')
      ),
      children: () => FragileSubtreeComponent()
    })
  );
}

function FragileSubtreeComponent(): HTMLElement {
  return el('div', { class: 'p-4 bg-slate-50 rounded-lg' },
    el('p', null, 'Subtree operating within safe ErrorBoundary perimeter.')
  );
}`,
    codeExplanation: '`ErrorBoundary` acts as a declarative containment perimeter. If any child component throws an uncaught error (such as an invalid resource fetch or signal exception), the error boundary catches it, prevents the rest of the application from crashing, and renders the accessible `fallback` element.',
    alternativeApproach: 'For build-time compiler errors, run `npx samrey audit` or `npx samrey analyze` to perform ahead-of-time static analysis on all template and signal dependencies.',
    commonMistakes: [
      'Silently swallowing errors in empty `try...catch` blocks, masking underlying state bugs.',
      'Creating circular signal evaluations (e.g. setting `signalA` inside an effect that reads `signalA`), triggering `AETH-301`.',
      'Omitting `key` props in `<For>`, which triggers `AETH-103`.'
    ],
    relatedApis: ['ErrorBoundary', 'onError', 'onCleanup', 'createTestHarness'],
    docLinks: [
      { label: 'Error Codes Reference Catalog', url: '#docs' },
      { label: 'Architecture & Troubleshooting', url: '#architecture' }
    ]
  },

  // 10. Reusable Components
  {
    id: 'reusable-components',
    keywords: ['reusable component', 'create component', 'props', 'component pattern', 'createComponent', 'lifecycle', 'onMount', 'onCleanup'],
    categories: ['runtime', 'reactivity'],
    title: 'Creating Reusable, Composable Components',
    shortAnswer: 'In Samrey, a reusable component is a plain TypeScript function that accepts strongly-typed props and returns native DOM elements via `el()`. Use `onMount()` and `onCleanup()` for component lifecycle management.',
    concept: 'Samrey components are NOT class instances or re-executing render functions. A component function executes ONCE during instantiation to set up DOM elements, signal bindings, and lifecycle hooks. Props can be primitive values, callbacks, or reactive `Signal<T>` / `ReadonlySignal<T>` objects.',
    recommendedApi: '`el(tag, props, ...children)` from `@samrey/runtime`, `onMount()`, and `onCleanup()` from `@samrey/runtime`.',
    whenToUse: 'Use for all modular UI building blocks: buttons, cards, modals, tables, badges, and layout containers.',
    implementationSteps: [
      'Define a clear TypeScript `interface` for the component props.',
      'Write the component function accepting `(props: MyProps): HTMLElement`.',
      'Construct DOM elements using `el()` with responsive Tailwind utility classes.',
      'Register setup logic in `onMount()` and teardown/cleanup logic in `onCleanup()`.',
      'Return the root `HTMLElement`.'
    ],
    tsCodeExample: `import { el, onMount, onCleanup } from '@samrey/runtime';
import { Signal, signal } from '@samrey/reactivity';

export interface CardProps {
  title: string;
  badgeText?: string;
  variant?: 'default' | 'highlight' | 'danger';
  expanded?: Signal<boolean>;
  onClose?: () => void;
  children?: HTMLElement | HTMLElement[];
}

export function Card(props: CardProps): HTMLElement {
  const isInternalExpanded = props.expanded || signal(true);

  const variantStyles: Record<string, string> = {
    default: 'border-slate-200 bg-white text-slate-900',
    highlight: 'border-cyan-200 bg-cyan-50/50 text-cyan-950',
    danger: 'border-rose-200 bg-rose-50/50 text-rose-950'
  };

  // Lifecycle Hooks
  onMount(() => {
    // Executes once after the card is attached to the DOM
    console.log(\`Card mounted: \${props.title}\`);
  });

  onCleanup(() => {
    // Executes when the card is removed/unmounted
    console.log(\`Card unmounted: \${props.title}\`);
  });

  const cardElement = el('div', {
    class: \`rounded-2xl border p-5 shadow-xs transition space-y-3 \${variantStyles[props.variant || 'default']}\`
  },
    // Card Header
    el('div', { class: 'flex items-center justify-between' },
      el('div', { class: 'flex items-center space-x-2' },
        el('h3', { class: 'text-base font-bold tracking-tight' }, props.title),
        props.badgeText ? el('span', { class: 'text-[11px] px-2 py-0.5 rounded-full bg-slate-100 font-mono font-medium' }, props.badgeText) : null
      ),
      el('div', { class: 'flex items-center space-x-2' },
        el('button', {
          class: 'text-xs text-slate-500 hover:text-slate-900 px-2 py-1 rounded',
          onClick: () => isInternalExpanded.set(val => !val)
        }, () => isInternalExpanded.value ? 'Collapse' : 'Expand'),
        props.onClose ? el('button', {
          class: 'text-xs text-rose-600 hover:text-rose-800 p-1',
          onClick: props.onClose
        }, '✕') : null
      )
    ),

    // Card Body (Collapsible via signal binding)
    el('div', {
      class: () => isInternalExpanded.value ? 'block' : 'hidden'
    },
      props.children || el('p', { class: 'text-sm text-slate-600' }, 'No content provided.')
    )
  );

  return cardElement;
}`,
    codeExplanation: '`Card` creates a self-contained, typed component. The body visibility is toggled by reading `isInternalExpanded.value` in the `class` function. `onMount` runs after DOM attachment, and `onCleanup` guarantees teardown if the card is destroyed inside a `<Show>` or `<For>` control flow.',
    alternativeApproach: 'You can also use `createComponent(Card, props)` when instantiating components dynamically or inside custom factory wrappers.',
    commonMistakes: [
      'Trying to return JSX without a build step; in pure TypeScript use `el()` or configure `@samrey/compiler`.',
      'Registering window event listeners in component bodies without unregistering them in `onCleanup()`, resulting in memory leaks.',
      'Assuming the component function will re-run on every state change.'
    ],
    relatedApis: ['el', 'createComponent', 'onMount', 'onCleanup', 'Show', 'For'],
    docLinks: [
      { label: 'Templates & Component Design', url: '#architecture' },
      { label: 'Public API Specification', url: '#docs' }
    ]
  },

  // 11. Testing Components with @samrey/testing
  {
    id: 'testing-components',
    keywords: ['test a component', 'test component', 'testing', 'renderTest', 'fireEvent', 'waitFor', 'flushReactivity', 'waitForNextUpdate', 'test harness', 'unit test', '@samrey/testing'],
    categories: ['runtime', 'reactivity', 'general'],
    title: 'Testing Samrey Components with @samrey/testing',
    shortAnswer: 'Test Samrey components using `renderTest()` from `@samrey/testing` to instantiate components in isolated reactive roots, `fireEvent()` to simulate user interactions, and `waitFor()` / `flushReactivity()` to assert asynchronous state transitions.',
    concept: 'Samrey components execute once to construct native DOM elements and signal subscribers. `@samrey/testing` wraps component execution in `createRoot()`, providing an `unmount()` disposer, synthetic event dispatchers (`fireEvent`), and microtask flush utilities (`waitFor`, `flushReactivity`) without requiring a full browser or heavy virtual DOM mocks.',
    recommendedApi: '`renderTest()`, `fireEvent()`, `waitFor()`, and `flushReactivity()` from `@samrey/testing`.',
    whenToUse: 'Use for all unit tests, integration tests, and component interaction assertions in Node.js test runners (such as node:test, Vitest, or Jest).',
    implementationSteps: [
      'Import `renderTest`, `fireEvent`, and `flushReactivity` / `waitFor` from `@samrey/testing`.',
      'Render the component inside `renderTest(() => MyComponent(props))`.',
      'Query container DOM elements and assert initial states.',
      'Simulate user actions via `fireEvent(button, "click")` or input events.',
      'Await reactive DOM updates using `await flushReactivity()` or `await waitFor(...)`.',
      'Call `result.unmount()` or `cleanupAllTestContainers()` in teardown.'
    ],
    tsCodeExample: `import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { el } from '@samrey/runtime';
import { signal } from '@samrey/reactivity';
import { renderTest, fireEvent, flushReactivity } from '@samrey/testing';

// Component under test
function Counter(): HTMLElement {
  const count = signal(0);
  return el('div', { id: 'counter-root' },
    el('span', { id: 'count-display' }, () => \`Count: \${count.value}\`),
    el('button', {
      id: 'inc-btn',
      onClick: () => count.set(c => c + 1)
    }, 'Increment')
  );
}

describe('Counter Component', () => {
  it('updates DOM reactively on click', async () => {
    const { container, unmount } = renderTest(() => Counter());
    const display = (container as HTMLElement).querySelector('#count-display');
    const button = (container as HTMLElement).querySelector('#inc-btn');

    assert.equal(display?.textContent, 'Count: 0');

    // Simulate user click
    fireEvent(button!, 'click');
    await flushReactivity();

    assert.equal(display?.textContent, 'Count: 1');

    // Clean up reactive root
    unmount();
  });
});`,
    completeWorkingExample: `import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { el, Show } from '@samrey/runtime';
import { signal } from '@samrey/reactivity';
import { renderTest, fireEvent, waitFor } from '@samrey/testing';

function AsyncGreeting(): HTMLElement {
  const isLoaded = signal(false);
  const name = signal('');

  const loadData = () => {
    setTimeout(() => {
      name.set('Samrey Developer');
      isLoaded.set(true);
    }, 50);
  };

  return el('div', null,
    el('button', { id: 'load-btn', onClick: loadData }, 'Load User'),
    Show({
      when: () => isLoaded.value,
      children: () => el('p', { id: 'greeting' }, () => \`Hello, \${name.value}!\`)
    })
  );
}

describe('AsyncGreeting Component', () => {
  it('renders greeting after asynchronous state transition', async () => {
    const { container, unmount } = renderTest(() => AsyncGreeting());
    const button = (container as HTMLElement).querySelector('#load-btn');

    fireEvent(button!, 'click');

    // Wait for reactive DOM condition
    await waitFor(() => {
      const greeting = (container as HTMLElement).querySelector('#greeting');
      return greeting?.textContent === 'Hello, Samrey Developer!';
    }, 500);

    const greeting = (container as HTMLElement).querySelector('#greeting');
    assert.equal(greeting?.textContent, 'Hello, Samrey Developer!');

    unmount();
  });
});`,
    codeExplanation: '`renderTest` executes the component factory inside an isolated reactive root, returning the container DOM node and an `unmount()` function. `fireEvent` dispatches synthetic events that trigger signal mutations. `flushReactivity()` or `waitFor()` ensures asynchronous microtasks and timers settle before assertions run.',
    alternativeApproach: 'You can also use `createMockResource()` for mocking async HTTP data fetching in tests.',
    commonMistakes: [
      'Forgetting to await `flushReactivity()` or `waitFor()` after dispatching an event, checking DOM values before the microtask queue flushes.',
      'Forgetting to call `unmount()` in long test suites, which may keep signal effects subscribed.',
      'Testing components with React Testing Library instead of the native `@samrey/testing` harness.'
    ],
    relatedApis: ['renderTest', 'fireEvent', 'waitFor', 'flushReactivity', 'createMockResource', 'createRoot'],
    docLinks: [
      { label: 'Testing Harness & Event Dispatchers', url: '#docs' }
    ]
  },

  // 12. Live Debounced Search Box with Async Resource
  {
    id: 'live-search-debounce',
    keywords: ['live search', 'search box', 'debounce', 'wait 300ms', '300ms', 'stops typing', 'search api', 'search results', 'live search box'],
    categories: ['reactivity', 'http', 'runtime'],
    title: 'Live Debounced Search Box with API Loading & Error Handling',
    shortAnswer: 'Implement live search in Samrey by binding an `<input>` to a reactive `searchQuery` signal, debouncing with `setTimeout` or a reactive timer, querying with `createHttpClient()` or `resource()`, and rendering loading, error, and result states with `<Show>` and `<For>`.',
    concept: 'In Samrey, component functions run once. As the user types, input events update the search signal. A debounced effect or timer schedules the API call only after the user stops typing for 300ms, preventing wasteful network traffic. The async response updates results reactively with fine-grained DOM updates.',
    recommendedApi: '`signal()` and `effect()` from `@samrey/reactivity`, `createHttpClient()` from `@samrey/http`, and `el()`, `Show`, `For` from `@samrey/runtime`.',
    whenToUse: 'Use for typeahead search boxes, live filters, autocomplete inputs, and throttled data lookup.',
    implementationSteps: [
      'Create reactive signals for `query`, `results`, `isLoading`, and `error`.',
      'Attach an `onInput` handler to update `query.value` on keystrokes.',
      'Debounce the API call by clearing and resetting a 300ms timer inside an effect or input handler.',
      'Fetch data using `api.get()` inside a `try/catch` block, toggling `isLoading` and catching errors.',
      'Render UI declaratively with `<Show>` for loading/error indicators and `<For>` for matching results.'
    ],
    tsCodeExample: `import { el, Show, For } from '@samrey/runtime';
import { signal, onCleanup } from '@samrey/reactivity';
import { createHttpClient } from '@samrey/http';

interface SearchResultItem {
  id: string;
  title: string;
  category: string;
}

const api = createHttpClient({ baseUrl: 'https://api.example.com' });

export function LiveSearchBox(): HTMLElement {
  const query = signal('');
  const results = signal<SearchResultItem[]>([]);
  const isLoading = signal(false);
  const error = signal<string | null>(null);
  let debounceTimer: ReturnType<typeof setTimeout> | null = null;

  async function performSearch(term: string) {
    if (!term.trim()) {
      results.set([]);
      isLoading.set(false);
      error.set(null);
      return;
    }

    isLoading.set(true);
    error.set(null);

    try {
      const data = await api.get<SearchResultItem[]>(\`/search?q=\${encodeURIComponent(term)}\`);
      results.set(data);
    } catch (err: any) {
      error.set(err.message || 'Failed to fetch search results');
      results.set([]);
    } finally {
      isLoading.set(false);
    }
  }

  function handleInput(e: Event) {
    const text = (e.target as HTMLInputElement).value;
    query.set(text);

    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      performSearch(text);
    }, 300);
  }

  onCleanup(() => {
    if (debounceTimer) clearTimeout(debounceTimer);
  });

  return el('div', { class: 'p-6 max-w-lg mx-auto bg-white rounded-2xl border space-y-4' },
    el('h3', { class: 'text-xl font-bold text-slate-900' }, 'Live Search'),
    el('input', {
      type: 'text',
      placeholder: 'Search products or docs (debounced 300ms)...',
      class: 'w-full px-4 py-2.5 border rounded-xl focus:ring-2 focus:ring-slate-900',
      value: () => query.value,
      onInput: handleInput
    }),

    // Loading State
    Show({
      when: () => isLoading.value,
      children: () => el('div', { class: 'p-3 text-sm text-slate-500 animate-pulse' }, 'Searching...')
    }),

    // Error State
    Show({
      when: () => !!error.value,
      children: () => el('div', { class: 'p-3 bg-rose-50 text-rose-700 rounded-lg text-sm' }, () => error.value!)
    }),

    // Empty Results State
    Show({
      when: () => !isLoading.value && !error.value && query.value.trim() !== '' && results.value.length === 0,
      children: () => el('p', { class: 'p-3 text-sm text-slate-400' }, 'No results found.')
    }),

    // Results List
    Show({
      when: () => !isLoading.value && results.value.length > 0,
      children: () => el('ul', { class: 'divide-y divide-slate-100 border rounded-xl' },
        For({
          each: () => results.value,
          key: (item) => item.id,
          children: (item) => el('li', { class: 'p-3 hover:bg-slate-50 flex justify-between' },
            el('span', { class: 'font-medium text-slate-800' }, item.title),
            el('span', { class: 'text-xs text-slate-400' }, item.category)
          )
        })
      )
    })
  );
}`,
    codeExplanation: '`LiveSearchBox` sets up fine-grained reactive state. Typing resets the 300ms debounce timer. When the timer elapses, `performSearch` triggers an async HTTP call. The UI reactively presents loading, error, empty, or results states via `<Show>` and `<For>` without re-rendering parent containers.',
    alternativeApproach: 'You can also wrap `performSearch` in `resource()` with an auto-updating accessor signal.',
    commonMistakes: [
      'Triggering an HTTP request on every single keydown/input event without debouncing.',
      'Forgetting to clear active timers in `onCleanup()`, leading to pending requests after unmount.'
    ],
    relatedApis: ['signal', 'effect', 'onCleanup', 'createHttpClient', 'Show', 'For'],
    docLinks: [
      { label: 'HTTP & Async Guide', url: '#architecture' },
      { label: 'Reactivity & Control Flow', url: '#reactivity' }
    ]
  },

  // 13. Optimistic Updates with Rollback
  {
    id: 'optimistic-task-deletion',
    keywords: ['optimistic', 'optimistic deletion', 'optimistic task deletion', 'rollback', 'api request fails', 'revert state', 'optimistic updates'],
    categories: ['reactivity', 'http', 'runtime'],
    title: 'Optimistic State Updates with Automatic Rollback on Error',
    shortAnswer: 'Implement optimistic UI updates in Samrey by immediately mutating local reactive state (signals/stores), preserving a rollback snapshot, dispatching the asynchronous API call, and restoring the snapshot if the request fails.',
    concept: 'Optimistic UI makes interactions instantaneous for users. In Samrey, mutating a signal updates the DOM immediately in O(1) time. By capturing previous state before mutation, any network or server rejection can revert the signal seamlessly while showing an actionable error toast or alert.',
    recommendedApi: '`signal()`, `batch()` from `@samrey/reactivity`, `createHttpClient()` from `@samrey/http`, and `el()`, `Show`, `For` from `@samrey/runtime`.',
    whenToUse: 'Use for task deletion, like buttons, favorites, quantity toggles, and any action where instant user feedback is desired.',
    implementationSteps: [
      'Maintain reactive list state in a `signal<Item[]>(initialItems)`.',
      'On user action, snapshot current state: `const previous = tasks.value`.',
      'Optimistically update the signal immediately: `tasks.set(t => t.filter(...))`.',
      'Perform async API operation in a `try/catch` block.',
      'If the API throws an error, revert local state: `tasks.set(previous)` and set an error notification signal.'
    ],
    tsCodeExample: `import { el, Show, For } from '@samrey/runtime';
import { signal } from '@samrey/reactivity';
import { createHttpClient } from '@samrey/http';

interface Task {
  id: string;
  title: string;
}

const api = createHttpClient({ baseUrl: 'https://api.example.com' });

export function OptimisticTaskList(): HTMLElement {
  const tasks = signal<Task[]>([
    { id: '1', title: 'Write production specs' },
    { id: '2', title: 'Verify zero-eval security' },
    { id: '3', title: 'Deploy Samrey application' }
  ]);
  const errorNotification = signal<string | null>(null);

  async function deleteTaskOptimistically(id: string) {
    // 1. Snapshot previous state for rollback
    const snapshot = [...tasks.value];
    errorNotification.set(null);

    // 2. Immediate optimistic local update
    tasks.set(current => current.filter(t => t.id !== id));

    // 3. Dispatch remote API deletion
    try {
      await api.delete(\`/tasks/\${id}\`);
      console.log(\`Task \${id} deleted remotely\`);
    } catch (err: any) {
      // 4. Rollback to snapshot on failure
      tasks.set(snapshot);
      errorNotification.set(\`Failed to delete task: \${err.message || 'Server error'}. Restored item.\`);
    }
  }

  return el('div', { class: 'p-6 max-w-md mx-auto bg-white rounded-2xl border space-y-4' },
    el('h3', { class: 'text-xl font-bold text-slate-900' }, 'Optimistic Task Manager'),

    Show({
      when: () => !!errorNotification.value,
      children: () => el('div', { class: 'p-3 bg-rose-50 text-rose-700 text-sm rounded-lg flex justify-between' },
        el('span', null, () => errorNotification.value!),
        el('button', { class: 'text-xs font-bold ml-2', onClick: () => errorNotification.set(null) }, '✕')
      )
    }),

    el('ul', { class: 'divide-y divide-slate-100' },
      For({
        each: () => tasks.value,
        key: (task) => task.id,
        children: (task) => el('li', { class: 'py-3 flex justify-between items-center' },
          el('span', { class: 'text-slate-800' }, task.title),
          el('button', {
            class: 'px-2.5 py-1 text-xs bg-rose-50 text-rose-600 rounded-lg hover:bg-rose-100',
            onClick: () => deleteTaskOptimistically(task.id)
          }, 'Delete')
        )
      })
    )
  );
}`,
    codeExplanation: 'When Delete is clicked, `tasks.set(...)` immediately removes the item from the DOM. If the network call fails, `tasks.set(snapshot)` instantly restores the task without reloading or re-rendering unaffected items.',
    alternativeApproach: 'You can also use `createStore` with `produce()` for nested objects or complex entity graphs.',
    commonMistakes: [
      'Mutating the previous snapshot in place before saving, corrupting the rollback copy.',
      'Failing to inform the user when an optimistic operation fails and rolls back.'
    ],
    relatedApis: ['signal', 'createHttpClient', 'produce', 'Show', 'For'],
    docLinks: [
      { label: 'State Management Guide', url: '#reactivity' },
      { label: 'HTTP Client Reference', url: '#architecture' }
    ]
  },

  // 14. Accessible Modal Dialog with Focus Management
  {
    id: 'accessible-modal-dialog',
    keywords: ['accessible modal', 'modal dialog', 'focus management', 'aria attributes', 'aria-modal', 'modal', 'escape key', 'dialog'],
    categories: ['runtime', 'reactivity', 'security'],
    title: 'Creating an Accessible Modal Dialog with Focus Management & ARIA',
    shortAnswer: 'Create accessible modals in Samrey by setting `role="dialog"`, `aria-modal="true"`, `aria-labelledby`, handling Escape key with `onCleanup()`, managing focus onto the modal and returning focus on close, and toggling visibility with `<Show>`.',
    concept: 'Accessibility requires proper semantic roles, ARIA descriptors, keyboard trapping, and clean focus restoration. In Samrey, modal elements bind reactive signals directly for open/close states, use `onMount` / `onCleanup` for global keyboard listeners, and clean up all listeners when disposed.',
    recommendedApi: '`el()`, `Show`, `onMount`, `onCleanup` from `@samrey/runtime` and `signal()` from `@samrey/reactivity`.',
    whenToUse: 'Use for all confirmation dialogs, popup editors, alert dialogs, and modal overlay panels.',
    implementationSteps: [
      'Create an `isOpen` signal to control modal visibility.',
      'Assign `role="dialog"`, `aria-modal="true"`, `aria-labelledby="dialog-title"` to the container.',
      'Register an Escape key listener in `onMount()` and remove it in `onCleanup()`.',
      'Store previous active element and restore focus when the modal closes.',
      'Provide an accessible close button and background backdrop click dismiss.'
    ],
    tsCodeExample: `import { el, Show, onCleanup } from '@samrey/runtime';
import { signal } from '@samrey/reactivity';

export function AccessibleModalDemo(): HTMLElement {
  const isOpen = signal(false);
  let previousActiveElement: HTMLElement | null = null;
  let modalContainer: HTMLElement | null = null;

  function openModal() {
    previousActiveElement = document.activeElement as HTMLElement;
    isOpen.set(true);
    setTimeout(() => {
      const closeBtn = modalContainer?.querySelector<HTMLButtonElement>('#modal-close-btn');
      closeBtn?.focus();
    }, 0);
  }

  function closeModal() {
    isOpen.set(false);
    if (previousActiveElement) {
      previousActiveElement.focus();
    }
  }

  function handleKeyDown(e: KeyboardEvent) {
    if (isOpen.value && e.key === 'Escape') {
      closeModal();
    }
  }

  window.addEventListener('keydown', handleKeyDown);
  onCleanup(() => {
    window.removeEventListener('keydown', handleKeyDown);
  });

  return el('div', { class: 'p-6 max-w-md mx-auto text-center space-y-4' },
    el('h2', { class: 'text-2xl font-bold text-slate-900' }, 'Accessible Modal'),
    el('button', {
      id: 'open-modal-trigger',
      class: 'px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800',
      onClick: openModal
    }, 'Open Confirmation Dialog'),

    Show({
      when: () => isOpen.value,
      children: () => {
        const modal = el('div', {
          class: 'fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4',
          onClick: (e: Event) => {
            if (e.target === e.currentTarget) closeModal();
          }
        },
          el('div', {
            role: 'dialog',
            'aria-modal': 'true',
            'aria-labelledby': 'modal-title',
            'aria-describedby': 'modal-desc',
            class: 'bg-white rounded-2xl max-w-sm w-full p-6 shadow-xl border space-y-4'
          },
            el('h3', { id: 'modal-title', class: 'text-lg font-bold text-slate-900' }, 'Confirm Action'),
            el('p', { id: 'modal-desc', class: 'text-sm text-slate-600' },
              'Are you sure you want to proceed? Pressing Escape or clicking outside will cancel.'
            ),
            el('div', { class: 'flex justify-end space-x-3 pt-2' },
              el('button', {
                class: 'px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg',
                onClick: closeModal
              }, 'Cancel'),
              el('button', {
                id: 'modal-close-btn',
                class: 'px-4 py-2 text-sm bg-slate-900 text-white rounded-lg hover:bg-slate-800',
                onClick: () => {
                  console.log('Confirmed');
                  closeModal();
                }
              }, 'Confirm')
            )
          )
        );
        modalContainer = modal;
        return modal;
      }
    })
  );
}`,
    codeExplanation: '`AccessibleModalDemo` binds the modal lifecycle to `isOpen`. Semantic attributes `role="dialog"`, `aria-modal="true"`, and `aria-labelledby` communicate state to screen readers. Focus is moved into the dialog on open and restored to the trigger button on close. `onCleanup()` prevents window listener leaks.',
    alternativeApproach: 'For complex multi-page applications, you can render modals into a portal or top-level overlay root using `createRoot()`.',
    commonMistakes: [
      'Omitting `role="dialog"` or `aria-modal="true"`, leaving assistive tech unaware of the modal.',
      'Leaving keyboard focus behind the backdrop without trapping or managing focus.',
      'Forgetting to remove `window.addEventListener("keydown", ...)` in `onCleanup()`.'
    ],
    relatedApis: ['el', 'Show', 'onCleanup', 'signal'],
    docLinks: [
      { label: 'Runtime & DOM Primitives', url: '#architecture' },
      { label: 'Reactivity & Control Flow', url: '#reactivity' }
    ]
  },

  // 15. Paginated Cached API Fetching with Cancellation
  {
    id: 'paginated-cached-api',
    keywords: ['paginated', 'pagination', 'cache api', 'cancel obsolete requests', 'abortcontroller', 'api integration', 'fetch paginated'],
    categories: ['http', 'reactivity', 'runtime'],
    title: 'Paginated API Fetching with In-Memory Caching & Request Cancellation',
    shortAnswer: 'Implement robust paginated data fetching in Samrey by binding a `page` signal to an async fetcher, caching results in a `Map<number, T>`, and canceling in-flight requests using `AbortController` when the page changes.',
    concept: 'Fast pagination requires avoiding redundant network calls for visited pages while instantly aborting obsolete in-flight requests when a user clicks next/previous rapidly. Samrey’s reactive signal graph coordinates pagination indices, cached pages, and fine-grained DOM updates.',
    recommendedApi: '`createHttpClient()`, `resource()` from `@samrey/http` and `signal()`, `effect()`, `onCleanup()` from `@samrey/reactivity`.',
    whenToUse: 'Use for paginated data tables, product grids, search result pages, and infinite scroll lists.',
    implementationSteps: [
      'Define reactive signals for `currentPage`, `pageData`, `isLoading`, and `totalPages`.',
      'Maintain an in-memory cache `Map<number, PageData>` at module or component scope.',
      'Before dispatching network request, check if `cache.has(page)`. If cached, set `pageData` instantly.',
      'If not cached, abort previous in-flight `AbortController` and fetch new page data.',
      'Update UI with `<Show>` for loading states and `<For>` for rendered table rows.'
    ],
    tsCodeExample: `import { el, Show, For } from '@samrey/runtime';
import { signal, effect, onCleanup } from '@samrey/reactivity';
import { createHttpClient } from '@samrey/http';

interface UserRecord {
  id: string;
  name: string;
  email: string;
}

interface PaginatedResponse {
  items: UserRecord[];
  totalPages: number;
}

const api = createHttpClient({ baseUrl: 'https://api.example.com' });

export function PaginatedUserTable(): HTMLElement {
  const currentPage = signal(1);
  const totalPages = signal(5);
  const users = signal<UserRecord[]>([]);
  const isLoading = signal(false);
  const cache = new Map<number, UserRecord[]>();
  let currentAbortController: AbortController | null = null;

  async function loadPage(page: number) {
    // 1. Check in-memory cache
    if (cache.has(page)) {
      users.set(cache.get(page)!);
      return;
    }

    // 2. Abort previous in-flight request
    if (currentAbortController) {
      currentAbortController.abort();
    }
    currentAbortController = new AbortController();

    isLoading.set(true);
    try {
      const response = await api.get<PaginatedResponse>(\`/users?page=\${page}&limit=10\`, {
        signal: currentAbortController.signal
      });
      cache.set(page, response.items);
      totalPages.set(response.totalPages);
      users.set(response.items);
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        console.error('Fetch error:', err);
      }
    } finally {
      isLoading.set(false);
    }
  }

  // Reactive effect triggers loadPage when currentPage changes
  effect(() => {
    loadPage(currentPage.value);
  });

  onCleanup(() => {
    if (currentAbortController) currentAbortController.abort();
    cache.clear();
  });

  return el('div', { class: 'p-6 max-w-2xl mx-auto bg-white rounded-2xl border space-y-4' },
    el('div', { class: 'flex justify-between items-center' },
      el('h3', { class: 'text-xl font-bold text-slate-900' }, 'User Directory'),
      el('span', { class: 'text-sm text-slate-500 font-mono' },
        () => \`Page \${currentPage.value} of \${totalPages.value}\`
      )
    ),

    Show({
      when: () => isLoading.value,
      children: () => el('div', { class: 'p-4 text-center text-slate-400 animate-pulse' }, 'Loading page data...')
    }),

    Show({
      when: () => !isLoading.value,
      children: () => el('table', { class: 'w-full text-left text-sm' },
        el('thead', { class: 'border-b bg-slate-50 text-slate-600' },
          el('tr', null,
            el('th', { class: 'p-3' }, 'ID'),
            el('th', { class: 'p-3' }, 'Name'),
            el('th', { class: 'p-3' }, 'Email')
          )
        ),
        el('tbody', { class: 'divide-y' },
          For({
            each: () => users.value,
            key: (u) => u.id,
            children: (user) => el('tr', { class: 'hover:bg-slate-50' },
              el('td', { class: 'p-3 font-mono text-xs text-slate-400' }, user.id),
              el('td', { class: 'p-3 font-medium text-slate-800' }, user.name),
              el('td', { class: 'p-3 text-slate-600' }, user.email)
            )
          })
        )
      )
    }),

    // Pagination Controls
    el('div', { class: 'flex justify-between items-center pt-2' },
      el('button', {
        class: 'px-3 py-1.5 border rounded-lg text-sm disabled:opacity-40',
        disabled: () => currentPage.value <= 1,
        onClick: () => currentPage.set(p => Math.max(1, p - 1))
      }, '← Previous'),
      el('button', {
        class: 'px-3 py-1.5 border rounded-lg text-sm disabled:opacity-40',
        disabled: () => currentPage.value >= totalPages.value,
        onClick: () => currentPage.set(p => Math.min(totalPages.value, p + 1))
      }, 'Next →')
    )
  );
}`,
    codeExplanation: '`PaginatedUserTable` responds to `currentPage` changes. If page data exists in `cache`, it loads instantaneously without network overhead. If a new network request is required, any previous pending fetch is cleanly aborted via `AbortController`, preventing race conditions.',
    alternativeApproach: 'You can use `@samrey/http`\'s `createCache()` for global TTL-based caching across routes.',
    commonMistakes: [
      'Not canceling obsolete requests, causing race conditions where slow older pages overwrite newer ones.',
      'Unbounded cache accumulation without cleanup on component unmount.'
    ],
    relatedApis: ['createHttpClient', 'createCache', 'signal', 'effect', 'onCleanup', 'For', 'Show'],
    docLinks: [
      { label: 'HTTP & Resource Management', url: '#architecture' },
      { label: 'Reactivity Engine Overview', url: '#reactivity' }
    ]
  },

  // 16. Task Dashboard with Multi-Criteria Filtering & Computed Statistics
  {
    id: 'task-dashboard-filtering',
    keywords: ['task dashboard', 'filters', 'priority sorting', 'computed statistics', 'search filter', 'real-world application logic', 'dashboard'],
    categories: ['reactivity', 'runtime'],
    title: 'Task Dashboard with Multi-Criteria Filtering, Search, & Computed Statistics',
    shortAnswer: 'Build comprehensive reactive dashboards in Samrey using `signal()` for raw items and filter criteria, `computed()` for multi-criteria filtering and real-time aggregate statistics, and `<For>` / `el()` for fine-grained rendering.',
    concept: 'In Samrey, computed signals form a dependency graph. When search query, priority filter, or task completion status changes, `computed()` recalculates filtered lists and summary statistics atomically without re-rendering the outer dashboard shell.',
    recommendedApi: '`signal()`, `computed()` from `@samrey/reactivity`, and `el()`, `For`, `Show` from `@samrey/runtime`.',
    whenToUse: 'Use for dashboards, analytics overviews, project managers, and filtered data explorers.',
    implementationSteps: [
      'Store tasks, search term, and priority filter in reactive signals.',
      'Derive `filteredTasks` using `computed()` combining search text and priority filters.',
      'Derive statistics (`total`, `completed`, `pending`, `completionRate`) in separate computed signals.',
      'Render metric cards and filtered table with `<For>`.',
      'Provide action handlers for adding and toggling tasks.'
    ],
    tsCodeExample: `import { el, For, Show } from '@samrey/runtime';
import { signal, computed } from '@samrey/reactivity';

interface DashboardTask {
  id: string;
  title: string;
  priority: 'low' | 'medium' | 'high';
  completed: boolean;
}

export function TaskDashboard(): HTMLElement {
  const tasks = signal<DashboardTask[]>([
    { id: '1', title: 'Review security audit', priority: 'high', completed: true },
    { id: '2', title: 'Implement fine-grained DOM bindings', priority: 'high', completed: true },
    { id: '3', title: 'Write integration benchmark suite', priority: 'medium', completed: false },
    { id: '4', title: 'Update documentation catalog', priority: 'low', completed: false }
  ]);

  const searchQuery = signal('');
  const priorityFilter = signal<'all' | 'low' | 'medium' | 'high'>('all');

  // Computed Derived List
  const filteredTasks = computed(() => {
    const q = searchQuery.value.toLowerCase().trim();
    const p = priorityFilter.value;
    return tasks.value.filter(task => {
      const matchesSearch = !q || task.title.toLowerCase().includes(q);
      const matchesPriority = p === 'all' || task.priority === p;
      return matchesSearch && matchesPriority;
    });
  });

  // Computed Aggregate Statistics
  const stats = computed(() => {
    const all = tasks.value;
    const total = all.length;
    const completed = all.filter(t => t.completed).length;
    const pending = total - completed;
    const percentage = total === 0 ? 0 : Math.round((completed / total) * 100);
    return { total, completed, pending, percentage };
  });

  function toggleTask(id: string) {
    tasks.set(current =>
      current.map(t => t.id === id ? { ...t, completed: !t.completed } : t)
    );
  }

  return el('div', { class: 'p-6 max-w-3xl mx-auto bg-white rounded-2xl border space-y-6' },
    // Header & Stats
    el('div', { class: 'flex justify-between items-center' },
      el('h2', { class: 'text-2xl font-bold text-slate-900' }, 'Task Dashboard'),
      el('span', { class: 'px-3 py-1 bg-emerald-50 text-emerald-700 font-mono text-sm rounded-full' },
        () => \`\${stats.value.percentage}% Complete (\${stats.value.completed}/\${stats.value.total})\`
      )
    ),

    // Metric Summary Cards
    el('div', { class: 'grid grid-cols-3 gap-4' },
      el('div', { class: 'p-4 bg-slate-50 rounded-xl border text-center' },
        el('p', { class: 'text-xs uppercase text-slate-500 font-semibold' }, 'Total Tasks'),
        el('p', { class: 'text-2xl font-bold text-slate-900 mt-1' }, () => stats.value.total)
      ),
      el('div', { class: 'p-4 bg-emerald-50 rounded-xl border border-emerald-100 text-center' },
        el('p', { class: 'text-xs uppercase text-emerald-600 font-semibold' }, 'Completed'),
        el('p', { class: 'text-2xl font-bold text-emerald-800 mt-1' }, () => stats.value.completed)
      ),
      el('div', { class: 'p-4 bg-amber-50 rounded-xl border border-amber-100 text-center' },
        el('p', { class: 'text-xs uppercase text-amber-600 font-semibold' }, 'Pending'),
        el('p', { class: 'text-2xl font-bold text-amber-800 mt-1' }, () => stats.value.pending)
      )
    ),

    // Filter Controls
    el('div', { class: 'flex space-x-3' },
      el('input', {
        type: 'text',
        placeholder: 'Search tasks...',
        class: 'flex-1 px-3 py-2 border rounded-lg text-sm',
        value: () => searchQuery.value,
        onInput: (e: Event) => searchQuery.set((e.target as HTMLInputElement).value)
      }),
      el('select', {
        class: 'px-3 py-2 border rounded-lg text-sm bg-white',
        onChange: (e: Event) => priorityFilter.set((e.target as HTMLSelectElement).value as any)
      },
        el('option', { value: 'all' }, 'All Priorities'),
        el('option', { value: 'high' }, 'High Priority'),
        el('option', { value: 'medium' }, 'Medium Priority'),
        el('option', { value: 'low' }, 'Low Priority')
      )
    ),

    // Filtered Task List
    el('ul', { class: 'divide-y border rounded-xl' },
      For({
        each: () => filteredTasks.value,
        key: (task) => task.id,
        children: (task) => el('li', { class: 'p-3 flex items-center justify-between hover:bg-slate-50' },
          el('div', { class: 'flex items-center space-x-3' },
            el('input', {
              type: 'checkbox',
              checked: () => task.completed,
              onChange: () => toggleTask(task.id)
            }),
            el('span', {
              class: () => task.completed ? 'line-through text-slate-400' : 'text-slate-800 font-medium'
            }, task.title)
          ),
          el('span', {
            class: \`text-xs px-2 py-0.5 rounded font-mono \${
              task.priority === 'high' ? 'bg-rose-100 text-rose-700' :
              task.priority === 'medium' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-600'
            }\`
          }, task.priority.toUpperCase())
        )
      })
    )
  );
}`,
    codeExplanation: '`TaskDashboard` uses pure signals and computed values. When `toggleTask` is invoked, `tasks` updates, automatically causing `stats` and `filteredTasks` to re-evaluate. The DOM nodes reading these computed accessors update surgically in O(1) time without re-running `TaskDashboard()`.',
    alternativeApproach: 'You can also use `createStore` with `produce()` to mutate nested properties directly.',
    commonMistakes: [
      'Calculating stats imperatively in event handlers instead of using declarative `computed()`.',
      'Unwrapping computed values statically during element creation instead of providing accessors `() => stats.value.total`.'
    ],
    relatedApis: ['signal', 'computed', 'For', 'Show', 'el'],
    docLinks: [
      { label: 'Reactivity Engine Guide', url: '#reactivity' },
      { label: 'Control Flow Primitives', url: '#architecture' }
    ]
  },

  // 17. Static Site Generation (SSG) for Multiple Dynamic Routes
  {
    id: 'ssg-static-page-generation',
    keywords: ['generate static pages', 'ssg', 'static site generation', 'static pages', 'pre render', 'products/1', 'renderToString ssg'],
    categories: ['ssr', 'runtime'],
    title: 'Static Site Generation (SSG) for Dynamic Route Paths',
    shortAnswer: 'Generate static pages in Samrey by iterating over route parameters, rendering each page to static HTML using `renderToString()` from `@samrey/ssr`, and emitting standalone static HTML files.',
    concept: 'Static Site Generation pre-renders pages at build time. Samrey’s `renderToString()` executes the component tree in an SSR environment, capturing static HTML without client-side hydration overhead if interactive JS is not needed, or embedding hydration tokens for resumable apps.',
    recommendedApi: '`renderToString()` from `@samrey/ssr` and `createRouter()` / `el()` from `@samrey/runtime`.',
    whenToUse: 'Use for blogs, product catalog pages, documentation sites, marketing landing pages, and static hosting (GitHub Pages, Cloudflare Pages, S3).',
    implementationSteps: [
      'Define the parameterized component factory: `ProductPage(props: { id: string })`.',
      'Enumerate all target route parameter permutations (e.g. `[1, 2, 3]`).',
      'Loop through routes and execute `await renderToString(() => ProductPage({ id }))`.',
      'Wrap the output in the static HTML document shell.',
      'Save each rendered page to the static distribution folder (e.g. `dist/products/1/index.html`).'
    ],
    tsCodeExample: `import { renderToString } from '@samrey/ssr';
import { el } from '@samrey/runtime';

interface Product {
  id: string;
  name: string;
  price: string;
}

const mockDb: Record<string, Product> = {
  '1': { id: '1', name: 'Samrey Enterprise Suite', price: '$499' },
  '2': { id: '2', name: 'Zero-Eval Security Shield', price: '$199' },
  '3': { id: '3', name: 'Compiler Optimization Toolkit', price: '$299' }
};

export function ProductPage(props: { id: string }): HTMLElement {
  const product = mockDb[props.id] || { id: props.id, name: 'Product Not Found', price: '$0' };

  return el('div', { class: 'p-8 max-w-xl mx-auto bg-white rounded-2xl border space-y-4' },
    el('span', { class: 'text-xs font-mono uppercase text-indigo-600 bg-indigo-50 px-2 py-1 rounded' },
      \`Static Page ID: \${product.id}\`
    ),
    el('h1', { class: 'text-3xl font-bold text-slate-900' }, product.name),
    el('p', { class: 'text-xl font-mono text-emerald-600 font-semibold' }, product.price),
    el('p', { class: 'text-slate-600 text-sm' }, 'Pre-rendered statically at build time via @samrey/ssr.')
  );
}

// SSG Build Script
export async function generateStaticProductPages(): Promise<Record<string, string>> {
  const productIds = ['1', '2', '3'];
  const generatedPages: Record<string, string> = {};

  for (const id of productIds) {
    const htmlBody = await renderToString(() => ProductPage({ id }));
    const fullHtml = \`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>Product \${id} — Samrey SSG</title>
</head>
<body class="bg-slate-50">
  <div id="app">\${htmlBody}</div>
</body>
</html>\`;
    generatedPages[\`/products/\${id}\`] = fullHtml;
  }

  return generatedPages;
}`,
    codeExplanation: '`generateStaticProductPages` iterates through the list of product IDs, executing `renderToString` on the `ProductPage` component. Each static HTML string is assembled into a full document ready for zero-server CDN deployment.',
    alternativeApproach: 'You can integrate this with the Samrey CLI static export command: `samrey export`.',
    commonMistakes: [
      'Relying on browser-only globals (`window.localStorage`) inside the SSG component body.',
      'Generating pages without setting `<meta charset="utf-8">` or viewport meta tags.'
    ],
    relatedApis: ['renderToString', 'serializeState', 'createSsrContext'],
    docLinks: [
      { label: 'SSR & Static Generation Specification', url: '#architecture' },
      { label: 'CLI & Build Commands', url: '#docs' }
    ]
  },

  // 18. High-Scale 10,000 Item List Performance
  {
    id: 'high-scale-list-performance',
    keywords: ['10000 list items', '10,000 list items', '10000 items', 'update one item', 'scale performance', 'performance model', '10000'],
    categories: ['performance', 'reactivity', 'runtime'],
    title: 'Updating 1 Item in 10,000 Efficiently via Samrey Fine-Grained Reactivity',
    shortAnswer: 'In a list of 10,000 items, Samrey updates a single item in O(1) time without diffing or re-rendering the other 9,999 items. Pass individual `Signal<T>` instances per item (or use `createStore`), key each row with `<For>`, and mutate only the specific item signal.',
    concept: 'Virtual DOM frameworks must re-render the list component and diff 10,000 VDOM nodes on any mutation. Samrey uses fine-grained push-pull dependency graphs: (1) Component function runs ONCE to mount the 10,000 DOM rows, (2) Each row binds its text node directly to that row’s signal, (3) Mutating item #42 notifies ONLY item #42’s text node. 9,999 DOM nodes are completely untouched.',
    recommendedApi: '`signal()` or `createStore()` from `@samrey/reactivity` and `<For>` from `@samrey/runtime`.',
    whenToUse: 'Use for high-frequency financial tickers, large tables, telemetry feeds, and data grids.',
    implementationSteps: [
      'Structure each item with individual signals: `{ id, name, value: signal(0) }` or wrap in `createStore`.',
      'Render the list with `For({ each: () => items, key: (item) => item.id, children: ... })`.',
      'Bind row text to accessor functions: `() => item.value.value`.',
      'To update item #42, invoke `items[42].value.set(newValue)` directly.',
      'Observe O(1) execution time with zero list re-traversal.'
    ],
    tsCodeExample: `import { el, For } from '@samrey/runtime';
import { signal, Signal } from '@samrey/reactivity';

interface StockRow {
  id: string;
  ticker: string;
  price: Signal<number>;
}

export function HighScaleStockTicker(): HTMLElement {
  // Generate 10,000 items with isolated reactive signals
  const stocks: StockRow[] = Array.from({ length: 10000 }, (_, i) => ({
    id: String(i),
    ticker: \`SYM-\${i}\`,
    price: signal(100.0)
  }));

  // Updating 1 single item in O(1) time:
  function updateSingleItem(index: number, newPrice: number) {
    stocks[index].price.set(newPrice);
    // ONLY the text node for stocks[index] updates!
    // The other 9,999 DOM nodes are completely untouched.
  }

  return el('div', { class: 'p-6 max-w-xl mx-auto bg-white rounded-2xl border space-y-4' },
    el('h3', { class: 'text-lg font-bold' }, 'High-Scale List (10,000 Items)'),
    el('button', {
      class: 'px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 text-sm',
      onClick: () => updateSingleItem(42, +(100 + Math.random() * 50).toFixed(2))
    }, 'Update Item #42 to Random Price'),

    el('ul', { class: 'h-80 overflow-y-auto divide-y border rounded-xl font-mono text-sm' },
      For({
        each: () => stocks,
        key: (stock) => stock.id,
        children: (stock) => el('li', { class: 'p-2 flex justify-between' },
          el('span', { class: 'font-semibold text-slate-700' }, stock.ticker),
          el('span', { class: 'text-emerald-600 font-bold' },
            () => \`$\${stock.price.value.toFixed(2)}\`
          )
        )
      })
    )
  );
}`,
    codeExplanation: '`stocks` contains 10,000 items. `<For>` keys each item by `stock.id` and creates the `li` once. Because `stock.price` is a distinct `Signal`, calling `updateSingleItem(42, ...)` triggers notifications exclusively to the O(1) subscriber for row #42. Zero diffing occurs across the other 9,999 items.',
    alternativeApproach: 'You can also use `createStore` where proxy path setters (`setStore("items", 42, "price", newPrice)`) achieve identical O(1) path notification.',
    commonMistakes: [
      'Storing all 10,000 items in a single primitive array signal and re-assigning the whole array on a single change without fine-grained item signals.',
      'Omitting the `key` function in `<For>`, which forces full list re-instantiation.'
    ],
    relatedApis: ['signal', 'createStore', 'For', 'batch', 'untrack'],
    docLinks: [
      { label: 'Reactivity Engine & Performance', url: '#reactivity' },
      { label: 'Runtime & DOM Primitives', url: '#architecture' }
    ]
  },

  // 19. Full Feature Composition (CRUD with Routing, Reactive State, Forms, HTTP, Loading/Error, Show/For)
  {
    id: 'full-crud-feature-composition',
    keywords: ['crud feature', 'full feature composition', 'combining routing', 'crud', 'full composition', 'routing reactive state forms http'],
    categories: ['router', 'forms', 'http', 'reactivity', 'runtime'],
    title: 'Full Feature Composition: CRUD with Routing, Reactive State, Forms, & HTTP',
    shortAnswer: 'Compose complete full-stack features in Samrey by orchestrating `@samrey/router` for navigation, `@samrey/reactivity` for state, `@samrey/forms` for validation, `@samrey/http` for API requests, and `@samrey/runtime` for fine-grained DOM rendering.',
    concept: 'Samrey packages are designed to integrate seamlessly without glue code. Components initialize once, routes switch dynamically, forms validate declaratively, HTTP calls handle async lifecycles, and fine-grained DOM subscribers reflect updates instantly.',
    recommendedApi: '`createRouter`, `Router`, `Route`, `Link` from `@samrey/router`, `createForm` from `@samrey/forms`, `createHttpClient` from `@samrey/http`, `signal()` from `@samrey/reactivity`, and `el()`, `Show`, `For` from `@samrey/runtime`.',
    whenToUse: 'Use for end-to-end production features, admin consoles, and complete application workflows.',
    implementationSteps: [
      'Configure HTTP client with `createHttpClient()`.',
      'Set up application state with reactive signals.',
      'Create standard schema validated form with `createForm()`.',
      'Build views for Item List, Item Create, and Item Detail.',
      'Wire views together using `createRouter()` and `<Router>`.',
      'Render loading, error, and dynamic lists with `<Show>` and `<For>`.'
    ],
    tsCodeExample: `import { el, Show, For } from '@samrey/runtime';
import { signal } from '@samrey/reactivity';
import { createRouter, Router, Route, Link, useParams } from '@samrey/router';
import { createForm } from '@samrey/forms';
import { createHttpClient } from '@samrey/http';

interface Note {
  id: string;
  title: string;
  body: string;
}

const api = createHttpClient({ baseUrl: 'https://api.example.com' });
const notes = signal<Note[]>([
  { id: '1', title: 'Samrey Architecture', body: 'Zero VDOM, fine-grained push-pull reactivity.' }
]);
const isLoading = signal(false);
const error = signal<string | null>(null);

// 1. List View
function NoteListView(): HTMLElement {
  return el('div', { class: 'p-6 space-y-4' },
    el('div', { class: 'flex justify-between items-center' },
      el('h2', { class: 'text-2xl font-bold' }, 'My Notes'),
      Link({ href: '/notes/new', class: 'px-3 py-1.5 bg-slate-900 text-white rounded-lg text-sm' }, '+ New Note')
    ),
    Show({
      when: () => isLoading.value,
      children: () => el('p', { class: 'text-slate-400' }, 'Loading notes...')
    }),
    el('ul', { class: 'divide-y border rounded-xl' },
      For({
        each: () => notes.value,
        key: (n) => n.id,
        children: (note) => el('li', { class: 'p-4 flex justify-between items-center' },
          el('div', null,
            el('h4', { class: 'font-bold text-slate-800' }, note.title),
            el('p', { class: 'text-xs text-slate-500' }, note.body)
          ),
          Link({ href: \`/notes/\${note.id}\`, class: 'text-xs text-indigo-600 font-semibold' }, 'View →')
        )
      })
    )
  );
}

// 2. Create Note Form View
function NoteCreateView(): HTMLElement {
  const form = createForm({
    initialValues: { title: '', body: '' },
    onSubmit: async (values) => {
      isLoading.set(true);
      try {
        const newNote: Note = { id: String(Date.now()), title: values.title, body: values.body };
        notes.set(curr => [...curr, newNote]);
        window.history.pushState(null, '', '/notes');
        window.dispatchEvent(new PopStateEvent('popstate'));
      } catch (err: any) {
        error.set(err.message);
      } finally {
        isLoading.set(false);
      }
    }
  });

  const titleField = form.field('title');
  const bodyField = form.field('body');

  return el('form', { class: 'p-6 space-y-4 max-w-md', onSubmit: form.handleSubmit },
    el('h3', { class: 'text-xl font-bold' }, 'Create Note'),
    el('div', { class: 'space-y-1' },
      el('label', { class: 'text-xs font-semibold' }, 'Title'),
      el('input', {
        class: 'w-full p-2 border rounded',
        value: () => titleField.value.value,
        onInput: (e: Event) => titleField.value.set((e.target as HTMLInputElement).value)
      })
    ),
    el('div', { class: 'space-y-1' },
      el('label', { class: 'text-xs font-semibold' }, 'Body'),
      el('textarea', {
        class: 'w-full p-2 border rounded',
        value: () => bodyField.value.value,
        onInput: (e: Event) => bodyField.value.set((e.target as HTMLTextAreaElement).value)
      })
    ),
    el('div', { class: 'flex space-x-3' },
      el('button', { type: 'submit', class: 'px-4 py-2 bg-slate-900 text-white rounded' }, 'Save Note'),
      Link({ href: '/notes', class: 'px-4 py-2 text-slate-600' }, 'Cancel')
    )
  );
}

// 3. Detail View
function NoteDetailView(): HTMLElement {
  const params = useParams();
  const note = () => notes.value.find(n => n.id === params.value.id);

  return el('div', { class: 'p-6 space-y-3' },
    Show({
      when: () => !!note(),
      children: () => el('div', { class: 'space-y-2' },
        el('h2', { class: 'text-2xl font-bold' }, () => note()?.title || ''),
        el('p', { class: 'text-slate-600' }, () => note()?.body || ''),
        Link({ href: '/notes', class: 'text-sm text-indigo-600' }, '← Back to Notes')
      )
    })
  );
}

// 4. App Shell & Router
export function CrudApp(): HTMLElement {
  const router = createRouter({
    routes: [
      { path: '/notes', component: NoteListView },
      { path: '/notes/new', component: NoteCreateView },
      { path: '/notes/:id', component: NoteDetailView }
    ]
  });

  return el('div', { class: 'min-h-screen bg-slate-50 p-6' },
    Router({
      router,
      children: [
        Route({ path: '/notes', component: NoteListView }),
        Route({ path: '/notes/new', component: NoteCreateView }),
        Route({ path: '/notes/:id', component: NoteDetailView })
      ]
    })
  );
}`,
    codeExplanation: '`CrudApp` composes `@samrey/router` for page switching, `@samrey/forms` for form lifecycle, `@samrey/reactivity` for shared state synchronization, and `@samrey/runtime` for fast DOM creation without virtual DOM diffing.',
    alternativeApproach: 'You can abstract persistent data operations into dedicated service modules with `@samrey/http`.',
    commonMistakes: [
      'Creating multiple disconnected routers or duplicating state across un-synced child components.',
      'Importing foreign routing or form packages.'
    ],
    relatedApis: ['createRouter', 'createForm', 'createHttpClient', 'signal', 'For', 'Show'],
    docLinks: [
      { label: 'Architecture & Packages', url: '#architecture' },
      { label: 'Public API Specification', url: '#docs' }
    ]
  }
];

/**
 * Deterministic Semantic Retrieval Engine for Samrey v1.0.0.
 * Matches natural-language questions to authoritative knowledge items
 * and synthesizes the exact required 12-section answer format.
 */
export function queryKnowledgeBase(rawQuery: string): AssistantAnswer {
  const normalized = rawQuery.trim().toLowerCase();

  // Handle foreign framework queries explicitly (Foreign API invariant)
  if (/usecallback|usememo|usestate|useeffect|usereducer|usecontext.*react/i.test(normalized)) {
    return {
      id: 'foreign-react-hook',
      query: rawQuery,
      category: 'reactivity',
      title: 'React Hooks vs. Samrey Native Reactivity',
      shortAnswer: 'Samrey v1.0.0 does NOT have `useState`, `useEffect`, `useCallback`, or `useMemo`. Instead, Samrey uses pure fine-grained `signal()`, `computed()`, and `effect()` primitives from `@samrey/reactivity`.',
      concept: 'Because Samrey components run ONCE during initial mount (rather than re-executing on every state update), hooks with dependency arrays and stale closure pitfalls do not exist in Samrey. A `signal()` is a stable reactive reference, and functions passed to `el()` automatically track dependencies.',
      recommendedApi: '`signal<T>()`, `computed<T>()`, and `effect()` from `@samrey/reactivity`.',
      whenToUse: 'Use whenever you need reactive state in Samrey components instead of React hooks.',
      implementationSteps: [
        'Replace `const [x, setX] = useState(0)` with `const x = signal(0)`.',
        'Replace `const y = useMemo(() => x * 2, [x])` with `const y = computed(() => x.value * 2)`.',
        'Replace `useEffect(() => { ... }, [x])` with `effect(() => { ... })`.',
        'Directly pass `() => x.value` to DOM elements in `el()`; no `useCallback` memoization ceremony is needed.'
      ],
      tsCodeExample: `import { el } from '@samrey/runtime';
import { signal, computed, effect } from '@samrey/reactivity';

export function ModernCounter(): HTMLElement {
  // 1. Reactive Signal (replaces useState)
  const count = signal(0);

  // 2. Computed Derivation (replaces useMemo)
  const doubleCount = computed(() => count.value * 2);

  // 3. Side Effect (replaces useEffect)
  effect(() => {
    console.log(\`Count changed: \${count.value}\`);
  });

  return el('div', { class: 'p-4 space-y-2' },
    el('p', null, () => \`Count: \${count.value} | Double: \${doubleCount.value}\`),
    el('button', { onClick: () => count.set(c => c + 1) }, 'Increment')
  );
}`,
      codeExplanation: 'The component executes once. `count.value` subscriptions are established automatically without dependency arrays. Updating `count.set()` directly updates the text node without re-running `ModernCounter()`.',
      commonMistakes: [
        'Trying to import hooks from React (Samrey is 100% independent and has 0 foreign dependencies).',
        'Creating dependency arrays (Samrey tracks dependencies automatically via runtime proxy graph).'
      ],
      relatedApis: ['signal', 'computed', 'effect', 'batch', 'untrack'],
      docLinks: [
        { label: 'Reactivity Engine Overview', url: '#reactivity' },
        { label: 'Public API Reference', url: '#docs' }
      ]
    };
  }

  // Handle foreign Vue / Svelte queries
  if (/v-model|ref\(|reactive\(|ngoninit|\$state|\$derived/i.test(normalized)) {
    return {
      id: 'foreign-vue-svelte',
      query: rawQuery,
      category: 'reactivity',
      title: 'Vue/Svelte Directives vs. Samrey Idiomatic Primitives',
      shortAnswer: 'Samrey v1.0.0 uses standard TypeScript functions and `@samrey/*` primitives. Two-way bindings use `createField()` or signal accessors, and state is declared with `signal()` or `createStore()`.',
      concept: 'Samrey does not require custom template compilers with proprietary directives like `v-model` or compiler runes like `$state`. Everything in Samrey is pure TypeScript leveraging fine-grained push-pull signals.',
      recommendedApi: '`signal()` and `createStore()` from `@samrey/reactivity` and `createField()` from `@samrey/forms`.',
      whenToUse: 'Use when converting patterns from Vue, Angular, or Svelte to idiomatic Samrey.',
      implementationSteps: [
        'Use `signal(value)` for local state.',
        'Use `createField()` or manual `onInput: (e) => mySignal.set(e.target.value)` for form inputs.',
        'Use `computed(() => ...)` for derived computations.'
      ],
      tsCodeExample: `import { el } from '@samrey/runtime';
import { signal } from '@samrey/reactivity';

export function TwoWayInput(): HTMLElement {
  const text = signal('Hello Samrey');

  return el('div', { class: 'p-4 space-y-2' },
    el('input', {
      value: () => text.value,
      onInput: (e: Event) => text.set((e.target as HTMLInputElement).value),
      class: 'border p-2 rounded'
    }),
    el('p', null, () => \`Mirror: \${text.value}\`)
  );
}`,
      codeExplanation: 'The input value is bound to `() => text.value`, and the `onInput` event handler updates `text.set()`. This delivers immediate, glitch-free two-way synchronization.',
      commonMistakes: [
        'Attempting to use `v-model` or `$state` syntax in TypeScript files.'
      ],
      relatedApis: ['signal', 'computed', 'createField', 'createForm'],
      docLinks: [{ label: 'Public API Specification', url: '#docs' }]
    };
  }

  // Check specific AETH error queries
  const aethMatch = normalized.match(/aeth-?(\d{3})/i);
  if (aethMatch) {
    const code = `AETH-${aethMatch[1]}`;
    return {
      id: `error-${code.toLowerCase()}`,
      query: rawQuery,
      category: 'errors',
      title: `Diagnosing & Resolving ${code}`,
      shortAnswer: `Error \`${code}\` is a standard diagnostic emitted by the Samrey framework. Consult the Diagnostic Catalog for the precise recovery step.`,
      concept: 'Samrey uses structured diagnostic error codes with visual source location frames, explanation descriptions, and deterministic recovery suggestions.',
      recommendedApi: '`ErrorBoundary` and `@samrey/runtime` diagnostic logger.',
      whenToUse: `Use when troubleshooting ${code} during development, build, or runtime.`,
      implementationSteps: [
        `Identify where ${code} was thrown in the call stack or build logs.`,
        'Check template tag closures, signal dependency cycles, or missing directive props.',
        'Wrap the offending component in an `<ErrorBoundary>` if the failure is an unhandled runtime exception.'
      ],
      tsCodeExample: `import { el, ErrorBoundary } from '@samrey/runtime';

export function SafeWrapper(): HTMLElement {
  return ErrorBoundary({
    fallback: (error) => el('div', { class: 'text-rose-600' }, \`Handled \${error}\`),
    children: () => el('div', null, 'Running cleanly')
  });
}`,
      codeExplanation: `Handles runtime exceptions gracefully, preventing crashes and displaying actionable error details for ${code}.`,
      commonMistakes: [
        'Ignoring the source location frame in terminal logs.'
      ],
      relatedApis: ['ErrorBoundary', 'onError', 'onCleanup'],
      docLinks: [
        { label: 'Error Codes Reference Catalog', url: '#docs' }
      ]
    };
  }

  // Score matching knowledge items
  let bestItem: KnowledgeItem = KNOWLEDGE_BASE[0];
  let highestScore = -1;

  for (const item of KNOWLEDGE_BASE) {
    let score = 0;

    // Check title keywords
    for (const word of item.title.toLowerCase().split(/\s+/)) {
      if (word.length > 3 && normalized.includes(word)) score += 5;
    }

    // Check item keywords
    for (const kw of item.keywords) {
      if (normalized.includes(kw.toLowerCase())) score += 10;
      const kwWords = kw.toLowerCase().split(/\s+/);
      for (const w of kwWords) {
        if (w.length > 3 && normalized.includes(w)) score += 3;
      }
    }

    // Check category matches
    for (const cat of item.categories) {
      if (normalized.includes(cat)) score += 4;
    }

    if (score > highestScore) {
      highestScore = score;
      bestItem = item;
    }
  }

  // If match score is too low and query is generic, construct custom response
  if (highestScore < 3) {
    return {
      id: 'custom-query',
      query: rawQuery,
      category: 'general',
      title: `Samrey Framework v1.0.0 Implementation Guide for "${rawQuery}"`,
      shortAnswer: `To implement this in Samrey v1.0.0, use native @samrey/* packages. Samrey provides fine-grained signals in @samrey/reactivity, zero-VDOM DOM helpers in @samrey/runtime, schema-driven forms in @samrey/forms, type-safe routing in @samrey/router, and built-in security in @samrey/security.`,
      concept: `Samrey architecture is built on three core pillars: (1) Fine-grained push-pull topological reactivity with zero VDOM diffing, (2) One-time component execution where functions run once to wire the reactive graph, and (3) Built-in security with zero-eval execution and automated XSS protection.`,
      recommendedApi: '`el()`, `signal()`, `computed()`, `Show`, and `For` from `@samrey/runtime` and `@samrey/reactivity`.',
      whenToUse: 'Use for all application feature implementations in Samrey v1.0.0.',
      implementationSteps: [
        'Import native primitives from `@samrey/runtime` and `@samrey/reactivity`.',
        'Declare state using `signal<T>(initialValue)` or `createStore<T>(initialState)`.',
        'Build the DOM structure using `el(tag, props, ...children)` with accessor functions for reactive bindings.',
        'Use `<Show>` for conditional branches and `<For>` for keyed lists.',
        'Mount to the DOM using `mount(component, container)` or hydrate using `hydrate()`.'
      ],
      tsCodeExample: `import { el, Show, For } from '@samrey/runtime';
import { signal, computed } from '@samrey/reactivity';

export function FeatureComponent(): HTMLElement {
  const items = signal<string[]>(['Item 1', 'Item 2']);
  const query = signal('');

  const filteredItems = computed(() =>
    items.value.filter(item => item.toLowerCase().includes(query.value.toLowerCase()))
  );

  return el('div', { class: 'p-6 max-w-lg mx-auto bg-white rounded-2xl border space-y-4' },
    el('h3', { class: 'text-xl font-bold' }, 'Samrey Feature Component'),
    el('input', {
      type: 'text',
      placeholder: 'Filter items...',
      class: 'w-full px-3 py-2 border rounded-lg',
      value: () => query.value,
      onInput: (e: Event) => query.set((e.target as HTMLInputElement).value)
    }),
    el('ul', { class: 'divide-y' },
      For({
        each: () => filteredItems.value,
        key: (item) => item,
        children: (item) => el('li', { class: 'py-2' }, item)
      })
    )
  );
}`,
      codeExplanation: 'This demonstrates the standard idiomatic Samrey component pattern: fine-grained reactive signals, computed derivations, and native DOM creation without external runtime dependencies.',
      commonMistakes: [
        'Introducing external foreign framework libraries (React, Vue, etc.).',
        'Calling `signal.value` without wrapping it in an accessor function inside `el()` attributes.'
      ],
      relatedApis: ['el', 'signal', 'computed', 'Show', 'For', 'createStore'],
      docLinks: [
        { label: 'Getting Started Guide', url: '#docs' },
        { label: 'Reactivity Engine Visualizer', url: '#reactivity' },
        { label: 'Architecture & Packages', url: '#architecture' }
      ]
    };
  }

  return {
    id: bestItem.id,
    query: rawQuery,
    category: bestItem.categories[0] || 'general',
    title: bestItem.title,
    shortAnswer: bestItem.shortAnswer,
    concept: bestItem.concept,
    recommendedApi: bestItem.recommendedApi,
    whenToUse: bestItem.whenToUse,
    implementationSteps: bestItem.implementationSteps,
    tsCodeExample: bestItem.tsCodeExample,
    completeWorkingExample: bestItem.completeWorkingExample,
    codeExplanation: bestItem.codeExplanation,
    alternativeApproach: bestItem.alternativeApproach,
    commonMistakes: bestItem.commonMistakes,
    relatedApis: bestItem.relatedApis,
    docLinks: bestItem.docLinks,
    isDirectMatch: highestScore >= 10
  };
}
