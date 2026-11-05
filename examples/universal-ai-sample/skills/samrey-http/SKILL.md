---
name: samrey-http
description: Fetch asynchronous data with createResource and manage HTTP requests with CSRF protection.
---

# HTTP Client & Async Resources (@samrey/http)

## Purpose
Guides asynchronous API data fetching, reactive loading/error states, and secure HTTP communication.

## Relevant APIs
- `createResource<T>(fetcher: () => Promise<T>): [ResourceState<T>, ResourceActions<T>]`
- `createHttpClient(options: HttpClientOptions): HttpClient`

## Verified Code Example
```ts
import { createResource } from '@samrey/http';
import { Show, template, bindText, on } from '@samrey/runtime';

interface Post { id: number; title: string; }

export function PostFeed() {
  const [posts, { refetch }] = createResource<Post[]>(async () => {
    const res = await fetch('/api/posts');
    if (!res.ok) throw new Error('Failed to load posts');
    return res.json();
  });

  const root = template(`
<div class="posts-feed">
  <button id="refetch-btn">Reload</button>
  <div id="content"></div>
</div>`)() as HTMLElement;

  on(root.querySelector('#refetch-btn')!, 'click', () => refetch());

  root.querySelector('#content')!.appendChild(
    Show({
      when: () => posts.loading.value,
      children: () => template('<p>Loading feed...</p>')(),
      fallback: () =>
        Show({
          when: () => posts.error.value !== null,
          children: () => template('<p class="err">Error loading posts.</p>')(),
          fallback: () => {
            const list = template('<ul class="list"></ul>')() as HTMLElement;
            for (const p of posts.data.value || []) {
              const li = document.createElement('li');
              li.textContent = p.title;
              list.appendChild(li);
            }
            return list;
          }
        })
    })
  );

  return root;
}
```
