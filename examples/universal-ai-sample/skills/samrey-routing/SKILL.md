---
name: samrey-routing
description: Implement client-side SPA routing with createRouter, RouterView, Link, and route parameters.
---

# Samrey Client-Side Routing (@samrey/router)

## Purpose
Explains how to define routes, mount the RouterView outlet, create navigation links, and access dynamic route parameters.

## Relevant APIs
- `createRouter({ routes, mode }): SamreyRouter`
- `RouterView(): Node`
- `Link({ href, children, class, activeClass }): HTMLAnchorElement`
- `useRoute(): ReactiveRouteState`
- `useNavigate(): (to: string) => void`

## Verified Code Example
```ts
import { createRouter, RouterView, Link, useRoute } from '@samrey/router';
import { template, bindText } from '@samrey/runtime';

function HomePage() {
  return template('<div><h2>Welcome Home</h2></div>')();
}

function ProductPage() {
  const route = useRoute();
  const root = template('<div><h2>Product Details</h2><p class="id"></p></div>')() as HTMLElement;
  bindText(root.querySelector('.id')!, () => `Product ID: ${route.params.id}`);
  return root;
}

export const router = createRouter({
  routes: [
    { path: '/', component: HomePage },
    { path: '/products/:id', component: ProductPage }
  ]
});

export function NavigationBar() {
  const nav = template('<header><nav class="nav"></nav><main></main></header>')() as HTMLElement;
  const navEl = nav.querySelector('.nav')!;
  
  navEl.appendChild(Link({ href: '/', children: 'Home' }));
  navEl.appendChild(Link({ href: '/products/101', children: 'Product #101' }));
  
  nav.querySelector('main')!.appendChild(RouterView());
  return nav;
}
```
