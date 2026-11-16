---
name: samrey-routing
description: Client-side routing, navigation outlets, route parameters, links, and navigation guards with @samrey/router.
---

# Samrey Client-Side Routing (`samrey-routing`)

## 1. Skill Description & Activation Criteria
- **Purpose**: Instructs how to build multi-page Single-Page Applications (SPAs) with `@samrey/router`.
- **Activation Criteria**: Trigger when configuring routes, rendering views via `RouterOutlet`, parsing URL path parameters, generating navigational links, or adding auth guards.

## 2. Framework Concepts
- **`createRouter(routes)`**: Declares the route tree and returns a singleton router instance.
- **`RouterOutlet()`**: Mounting node that dynamically renders the active route component.
- **`Link({ href, children })`**: Renders an accessible anchor tag with client-side history navigation.
- **`useParams()`**: Signal-based accessor for active route parameters (`:id`).
- **`useNavigate()`**: Imperative navigation helper.
- **`beforeEnter(to, from)`**: Guard callback to protect restricted routes.

## 3. Correct API Usage
```ts
import { createRouter, RouterOutlet, Link, useParams, useNavigate } from '@samrey/router';
import { template } from '@samrey/runtime';

export const router = createRouter([
  { path: '/', component: () => template('<div>Home</div>')() },
  { path: '/profile/:id', component: ProfileView },
  { path: '*', component: () => template('<div>404</div>')() }
]);
```

## 4. Verified Code Example
```ts
import { createRouter, RouterOutlet, Link, useParams } from '@samrey/router';
import { template, bindText } from '@samrey/runtime';

function UserDetail() {
  const params = useParams();
  const root = template('<div class="user-page">User ID: <span ref="id"></span></div>').clone();
  bindText(root.refs.id, () => params().id ?? 'None');
  return root;
}

export function Shell() {
  const root = template('<nav ref="menu"></nav><main ref="view"></main>').clone();
  const { menu, view } = root.refs;

  menu.appendChild(Link({ href: '/', children: 'Home' }));
  menu.appendChild(Link({ href: '/users/101', children: 'User 101' }));

  view.appendChild(RouterOutlet());
  return root;
}
```

## 5. Common Mistakes
- **Mistake**: Using standard `<a href="...">` without `Link()`, causing full browser page reloads.
  - *Correction*: Always use `Link({ href, children })` for client-side SPA routing.
- **Mistake**: Forgetting a wildcard fallback route `{ path: '*', component: NotFound }`.
  - *Correction*: Add a wildcard route to prevent unhandled 404 navigation errors.

## 6. Forbidden Patterns
- ❌ Do NOT manipulate `window.location` directly for internal SPA links.
- ❌ Do NOT import React Router.

## 7. Validation Procedures
1. Test routes using `renderTest(() => Shell())` from `@samrey/testing`.
2. Assert navigation changes with `flushReactivity()`.

## 8. Authoritative Documentation
- [ai/ROUTING_RULES.md](../../ROUTING_RULES.md)
- [ai/API_CONTRACTS.md](../../API_CONTRACTS.md#4-samreyrouter)
