/**
 * @license Apache-2.0
 * @samrey/doc - Samrey Developer Assistant Blind Challenge Benchmark
 *
 * Frozen suite of 20 realistic developer challenges covering the full scope of
 * modern web development in Samrey v1.0.0.
 *
 * Each challenge is designed to be executed independently in a fresh, isolated
 * context to verify that the assistant provides accurate, compilable, idiomatic,
 * and zero-hallucination answers without conversation contamination.
 */

export interface DeveloperChallenge {
  id: number;
  category: string;
  prompt: string;
  expectedCapabilities: string[];
  relevantPackages: string[];
  difficulty: 'beginner' | 'intermediate' | 'advanced';
}

export const CHALLENGES: DeveloperChallenge[] = [
  // 1. Reactivity
  {
    id: 1,
    category: 'Reactivity',
    prompt: 'Create a live search box in Samrey. Wait 300ms after the user stops typing, call an API, show a loading state, handle errors, and display the results.',
    expectedCapabilities: [
      'Reactive signal state management',
      'Debounced input timing (300ms)',
      'Async HTTP request dispatching',
      'Loading, error, empty, and results state rendering with Show/For'
    ],
    relevantPackages: ['@samrey/reactivity', '@samrey/runtime', '@samrey/http'],
    difficulty: 'intermediate'
  },

  // 2. Component Communication
  {
    id: 2,
    category: 'Component Communication',
    prompt: 'I have a parent component containing a list of users and a child component containing an edit button. When the child updates a user, the parent list should update reactively. Show the recommended Samrey architecture.',
    expectedCapabilities: [
      'One-time component execution model explanation',
      'Passing reactive Signals, updater callbacks, or Context through props',
      'Child component triggering signal mutations',
      'Fine-grained O(1) DOM updates without full parent re-render'
    ],
    relevantPackages: ['@samrey/reactivity', '@samrey/runtime'],
    difficulty: 'intermediate'
  },

  // 3. DOM
  {
    id: 3,
    category: 'DOM',
    prompt: 'Create a task list where adding, updating, and deleting a task updates only the necessary DOM nodes.',
    expectedCapabilities: [
      'Native DOM creation using el() without Virtual DOM overhead',
      'Keyed list reconciliation via <For>',
      'Fine-grained signal accessor bindings (() => signal.value)',
      'Surgical O(1) DOM node insertions, mutations, and deletions'
    ],
    relevantPackages: ['@samrey/reactivity', '@samrey/runtime'],
    difficulty: 'beginner'
  },

  // 4. Control Flow
  {
    id: 4,
    category: 'Control Flow',
    prompt: 'Create a component that displays different UI depending on loading, success, and error states.',
    expectedCapabilities: [
      'Declarative conditional rendering using <Show> or <Switch>/<Match>',
      'Reactive predicate functions (when: () => boolean)',
      'Fallback / error view handling',
      'Zero DOM node tearing on state switches'
    ],
    relevantPackages: ['@samrey/reactivity', '@samrey/runtime'],
    difficulty: 'beginner'
  },

  // 5. Routing
  {
    id: 5,
    category: 'Routing',
    prompt: 'Create a route /users/:id and show how to read the id parameter.',
    expectedCapabilities: [
      'Router instantiation with createRouter() and parameterized routes',
      'Reactive parameter extraction using useParams()',
      'Declarative <Router> and <Route> component composition',
      'Client-side navigation with <Link>'
    ],
    relevantPackages: ['@samrey/router', '@samrey/runtime'],
    difficulty: 'beginner'
  },

  // 6. Forms
  {
    id: 6,
    category: 'Forms',
    prompt: 'Create an accessible registration form with validation, touched state, errors, and submit handling.',
    expectedCapabilities: [
      'Form instantiation using createForm() from @samrey/forms',
      'Standard Schema validator integration (Zod/Valibot/Custom)',
      'Field touch tracking and reactive error signals',
      'Automatic ARIA attribute derivation and submit handling'
    ],
    relevantPackages: ['@samrey/forms', '@samrey/runtime', '@samrey/reactivity'],
    difficulty: 'intermediate'
  },

  // 7. HTTP
  {
    id: 7,
    category: 'HTTP',
    prompt: 'Load users from an API and display loading, success, empty, and error states.',
    expectedCapabilities: [
      'createHttpClient() or resource() from @samrey/http',
      'Reactive loading, error, and data signals',
      'Comprehensive branch rendering with <Show> and <For>',
      'Refetch or error recovery handling'
    ],
    relevantPackages: ['@samrey/http', '@samrey/runtime', '@samrey/reactivity'],
    difficulty: 'intermediate'
  },

  // 8. Async State
  {
    id: 8,
    category: 'Async State',
    prompt: 'Implement optimistic task deletion with rollback if the API request fails.',
    expectedCapabilities: [
      'Immediate local reactive signal/store update',
      'Snapshot preservation for rollback capability',
      'Asynchronous API request dispatching',
      'Automatic state restoration and error notification on rejection'
    ],
    relevantPackages: ['@samrey/reactivity', '@samrey/runtime', '@samrey/http'],
    difficulty: 'advanced'
  },

  // 9. Security
  {
    id: 9,
    category: 'Security',
    prompt: 'A user enters HTML into a comment field. Show how to safely render it without introducing XSS.',
    expectedCapabilities: [
      'sanitizeHtml() from @samrey/security with tag allowlist',
      'sanitizeUri() for external hyperlinks',
      'Zero-eval runtime execution architecture',
      'Safe DOM attribute/text rendering without XSS vulnerabilities'
    ],
    relevantPackages: ['@samrey/security', '@samrey/runtime'],
    difficulty: 'intermediate'
  },

  // 10. SSR
  {
    id: 10,
    category: 'SSR',
    prompt: 'Create an SSR page that renders initial data on the server and hydrates correctly on the client.',
    expectedCapabilities: [
      'Server-side rendering with renderToString() and serializeState()',
      'Automatic secret stripping and XSS-safe state serialization',
      'Client-side zero-redraw hydration with hydrate()',
      'No browser global access during SSR execution'
    ],
    relevantPackages: ['@samrey/ssr', '@samrey/runtime'],
    difficulty: 'advanced'
  },

  // 11. SSG
  {
    id: 11,
    category: 'SSG',
    prompt: 'Generate static pages for /products/1, /products/2 and /products/3.',
    expectedCapabilities: [
      'Static page loop iterating over dynamic parameter routes',
      'renderToString() from @samrey/ssr for static HTML generation',
      'Embedding rendered component markup into static HTML shells',
      'Output generation for zero-server CDN deployment'
    ],
    relevantPackages: ['@samrey/ssr', '@samrey/runtime'],
    difficulty: 'intermediate'
  },

  // 12. Performance
  {
    id: 12,
    category: 'Performance',
    prompt: "I have 10,000 list items. Explain how to update one item efficiently using Samrey's reactive DOM model.",
    expectedCapabilities: [
      'Fine-grained dependency isolation per item (signal per item or createStore)',
      'Keyed list management with <For>',
      'Surgical O(1) DOM node update for the single changed item',
      'Zero diffing across the remaining 9,999 items (unlike VDOM frameworks)'
    ],
    relevantPackages: ['@samrey/reactivity', '@samrey/runtime'],
    difficulty: 'advanced'
  },

  // 13. Error Handling
  {
    id: 13,
    category: 'Error Handling',
    prompt: 'A component creates an effect and event listeners. Ensure everything is cleaned up when the component is destroyed.',
    expectedCapabilities: [
      'onCleanup() hook registration inside active reactive owner',
      'teardown of DOM event listeners and active timers (clearInterval)',
      'Automatic disposal when parent component unmounts or recomputes',
      'Prevention of memory leaks in long-lived applications'
    ],
    relevantPackages: ['@samrey/reactivity', '@samrey/runtime'],
    difficulty: 'intermediate'
  },

  // 14. State Management
  {
    id: 14,
    category: 'State Management',
    prompt: 'Create shared application state for authentication/user preferences that can be consumed by multiple components.',
    expectedCapabilities: [
      'createStore() or module-scoped signal singleton or createContext/useContext',
      'Deep proxy-based fine-grained property path tracking',
      'produce() or surgical setters for immutable-style mutations',
      'Zero unnecessary re-renders across components subscribing to disjoint paths'
    ],
    relevantPackages: ['@samrey/reactivity', '@samrey/runtime'],
    difficulty: 'intermediate'
  },

  // 15. Real-world Application Logic
  {
    id: 15,
    category: 'Real-world Application Logic',
    prompt: 'Build a small task dashboard with filters, search, priority sorting, and computed statistics.',
    expectedCapabilities: [
      'Multi-signal coordination (items, search query, filter criteria)',
      'computed() derivation for filtered item lists and aggregate metrics',
      'Keyed rendering with <For> and dynamic status styling',
      'Interactive task state toggling and addition handlers'
    ],
    relevantPackages: ['@samrey/reactivity', '@samrey/runtime'],
    difficulty: 'advanced'
  },

  // 16. Migration
  {
    id: 16,
    category: 'Migration',
    prompt: 'Convert this React-style requirement into idiomatic Samrey without using React APIs: A counter component with useState, useEffect for document title, and a button.',
    expectedCapabilities: [
      'Replacement of useState with signal() from @samrey/reactivity',
      'Replacement of useEffect with effect() or onMount()',
      'Replacement of JSX with native el() DOM primitives',
      'Explanation of Samrey one-time execution vs React repeated render cycles'
    ],
    relevantPackages: ['@samrey/reactivity', '@samrey/runtime'],
    difficulty: 'intermediate'
  },

  // 17. Debugging
  {
    id: 17,
    category: 'Debugging',
    prompt: `Here is broken Samrey code. Diagnose why the signal is not updating and provide the corrected implementation:
\`\`\`ts
import { signal } from '@samrey/reactivity';
import { el } from '@samrey/runtime';
export function Broken() {
  const count = signal(0);
  return el('div', null, count.value, el('button', { onClick: () => { count.value++; } }, '+'));
}
\`\`\``,
    expectedCapabilities: [
      'Diagnosis: count.value was evaluated statically during component instantiation',
      'Explanation: Samrey components execute ONCE; dynamic values must be wrapped in accessor functions',
      'Correction: el("div", null, () => count.value, ...)',
      'Identification of related reactivity APIs and best practices'
    ],
    relevantPackages: ['@samrey/reactivity', '@samrey/runtime'],
    difficulty: 'intermediate'
  },

  // 18. Accessibility
  {
    id: 18,
    category: 'Accessibility',
    prompt: 'Create an accessible modal dialog with focus management and proper ARIA attributes.',
    expectedCapabilities: [
      'Proper ARIA attributes (role="dialog", aria-modal="true", aria-labelledby, aria-describedby)',
      'Keyboard Escape dismissal with onCleanup listener teardown',
      'Initial focus placement and focus restoration on close',
      'Accessible backdrop dismissal and close button controls'
    ],
    relevantPackages: ['@samrey/runtime', '@samrey/reactivity'],
    difficulty: 'intermediate'
  },

  // 19. API Integration
  {
    id: 19,
    category: 'API Integration',
    prompt: 'Fetch paginated API data, cache it, cancel obsolete requests, and update the UI correctly.',
    expectedCapabilities: [
      'createHttpClient() or resource() with page index reactivity',
      'In-memory caching mechanism (Map or createCache) to avoid redundant requests',
      'AbortController integration to cancel in-flight obsolete requests',
      'Clean loading, error, and paginated table UI rendering with <Show> and <For>'
    ],
    relevantPackages: ['@samrey/http', '@samrey/reactivity', '@samrey/runtime'],
    difficulty: 'advanced'
  },

  // 20. Full Feature Composition
  {
    id: 20,
    category: 'Full Feature Composition',
    prompt: 'Build a small CRUD feature combining routing, reactive state, forms, HTTP, loading/error handling, and conditional DOM rendering.',
    expectedCapabilities: [
      '@samrey/router for multi-view page routing and dynamic parameter navigation',
      '@samrey/reactivity for shared reactive store and signal state',
      '@samrey/forms for schema-driven form validation and touch management',
      '@samrey/http for API communication',
      '@samrey/runtime (el, Show, For) for fast fine-grained DOM rendering'
    ],
    relevantPackages: ['@samrey/router', '@samrey/reactivity', '@samrey/forms', '@samrey/http', '@samrey/runtime'],
    difficulty: 'advanced'
  }
];
