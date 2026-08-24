# Router & HTTP in Gati

## 1. Reactive Routing (`@gati/router`)

`@gati/router` provides client and server routing driven by fine-grained signals. Route transitions do not re-render the whole page; only the outlet and parameter bindings update.

### Defining Routes & Router Instance

```typescript
import { createRouter } from '@gati/router';

const router = createRouter([
  {
    path: '/',
    component: () => '<main><h1>Home</h1></main>'
  },
  {
    path: '/users/:id',
    component: () => '<main><h1>User Details</h1></main>'
  },
  {
    path: '/settings',
    component: () => '<main><h1>Settings</h1></main>'
  }
], '/');

// Access current route path and dynamic params reactively:
console.log(router.currentPath.value); // '/'

// Navigate
router.navigate('/users/42');
console.log(router.currentParams.value); // { id: '42' }
```

### Security: Open-Redirect & Path Injection Protection

The router automatically runs all navigation targets through `sanitizeRedirectUri`:
- Blocks protocol-relative paths (`//attacker.com`)
- Blocks external absolute schemes (`https://evil.org`)
- Safely handles malformed percent-encoded sequences (`/%E0%A4%A`) without throwing `URIError`
- Scrubs prototype pollution keys (`__proto__`, `constructor`) from parameter objects

---

## 2. Reactive Data Fetching (`@gati/http`)

`@gati/http` integrates async HTTP requests seamlessly into Gati's reactive dependency graph.

### `createResource` Primitive

```typescript
import { createResource, HttpClient } from '@gati/http';

interface User {
  id: string;
  name: string;
  email: string;
}

const client = new HttpClient({ baseUrl: 'https://api.example.com' });

export function UserView(userId: () => string) {
  const resource = createResource<User, string>(
    userId,
    async (id, { abortSignal }) => {
      return await client.get<User>(`/users/${id}`, { signal: abortSignal });
    }
  );

  // resource.data -> computed signal with latest resolved data
  // resource.loading -> computed boolean signal
  // resource.error -> computed error signal
  // resource.refetch -> trigger refresh
}
```

### In-Flight Deduplication & AbortController

When a reactive source changes rapidly, `createResource` automatically aborts obsolete in-flight requests using native `AbortController` and prevents race conditions.
