# @gati/router

Fine-grained reactive routing engine with nested routes, parameterized matching, route guards, async loaders, and zero full-page re-renders.

## Purpose

`@gati/router` provides client-side and universal routing built entirely on Gati reactive signals. Navigating between routes updates only the dynamic route view outlet rather than tearing down the root application shell.

## Installation

```bash
npm install @gati/router @gati/reactivity @gati/runtime
```

## Quick Example

```ts
import { createRouter, Link, RouterOutlet } from '@gati/router';
import { el } from '@gati/runtime';

const routes = [
  { path: '/', component: () => el('h1', null, 'Home View') },
  { path: '/users/:id', component: (params) => el('h2', null, `User ID: ${params.id}`) },
  { path: '*', component: () => el('h1', null, '404 Not Found') }
];

const router = createRouter({ routes });

function App() {
  return el('div', null,
    el('nav', null,
      Link({ to: '/', children: 'Home' }),
      Link({ to: '/users/42', children: 'User Profile' })
    ),
    RouterOutlet({ router })
  );
}
```

## API

- `createRouter(options: RouterOptions): Router` — Creates a reactive router instance.
- `Link(props: LinkProps): HTMLElement` — Accessible navigation link component with active state handling.
- `RouterOutlet(props: RouterOutletProps): HTMLElement` — Container rendering the component for the active matched route.
- `useRouter(): Router` — Retrieves the active router instance from context.
- `useParams(): Signal<Record<string, string>>` — Reactive signal containing matched URL route parameters.
- `useLocation(): Signal<LocationState>` — Reactive signal containing path, search, and hash.
- `useSearchParams(): [Signal<URLSearchParams>, (params: Record<string, string>) => void]` — Reactive query parameter hook.
- `matchRoute(pattern: string, pathname: string): RouteMatch | null` — Utility matching URL path patterns.

## Environment

Universal: Node.js (memory-based history for SSR) and browser environments (`HTML5 History API` or `hash` history).

## Security

Sanitizes navigation targets against `javascript:` injection and prevents open redirect attacks when handling external return URLs.

## Related Packages

- `@gati/runtime` — Renders route components into the DOM.
- `@gati/reactivity` — Drives reactive routing state.
- `@gati/ssr` — Server-side route matching and pre-rendering.

