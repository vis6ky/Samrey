# Samrey Framework — Routing Rules & Architecture (ROUTING_RULES.md)

**Package:** `@samrey/router`  
**Version:** 2.1.0  
**Authority:** Mandatory Client-Side Routing Rules for AI Agents

---

## 1. Core Router Primitives

Samrey's router provides fine-grained, component-based client-side routing with zero virtual DOM overhead.

### Key Exports
- `createRouter(routes: RouteRecord[], options?: RouterOptions)`: Initializes router instance.
- `RouterOutlet()`: Returns the mounting container where active route views are surgically rendered.
- `Link(props: { href: string; children: Node | string; class?: string })`: Renders accessible navigation anchor with pushState interception.
- `useNavigate()`: Hook-free function returning an imperative navigation function `navigate(path, { replace? })`.
- `useParams()`: Returns a getter function for route parameters (e.g. `const params = useParams(); console.log(params().id);`).
- `useLocation()`: Returns a getter function for current URL (`pathname`, `search`, `hash`).

---

## 2. Declaring Route Tables

```ts
import { createRouter, RouterOutlet, Link, useParams } from '@samrey/router';
import { template, bindText } from '@samrey/runtime';

// 1. Route Views
function HomeView() {
  return template('<div class="page"><h1>Home</h1></div>')();
}

function UserView() {
  const params = useParams();
  const root = template('<div class="page">User ID: <span ref="id"></span></div>').clone();
  bindText(root.refs.id, () => params().id ?? 'unknown');
  return root;
}

function NotFoundView() {
  return template('<div class="page">404 - Not Found</div>')();
}

// 2. Route Configuration
export const router = createRouter([
  { path: '/', component: HomeView },
  { path: '/users/:id', component: UserView },
  { path: '*', component: NotFoundView }
]);
```

---

## 3. Application Layout & Navigation Shell

```ts
import { template } from '@samrey/runtime';
import { RouterOutlet, Link } from '@samrey/router';

const _navTmpl = template(`
  <div class="app-layout">
    <header>
      <nav ref="links"></nav>
    </header>
    <main ref="outlet"></main>
  </div>
`);

export function AppLayout() {
  const root = _navTmpl.clone();
  const { links, outlet } = root.refs;

  // Add navigational links
  links.appendChild(Link({ href: '/', children: 'Home', class: 'nav-link' }));
  links.appendChild(Link({ href: '/users/42', children: 'User Profile', class: 'nav-link' }));

  // Mount the router outlet
  outlet.appendChild(RouterOutlet());

  return root;
}
```

---

## 4. Navigation Guards & Dynamic Transitions
- **`beforeEnter(to, from)`**: Route-level guard returning boolean or Promise<boolean> for authentication and authorization.
```ts
{
  path: '/admin',
  component: AdminView,
  beforeEnter: async () => {
    return isAuthenticated.value; // Redirects if false
  }
}
```
