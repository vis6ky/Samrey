# Samrey HTTP & Resource Example

Demonstrates reactive async resource fetching with `createResource`, automatic in-flight deduplication, and the zero-dependency `HttpClient`.

## Code Overview

```typescript
import { createResource, HttpClient } from '@samrey/http';

const client = new HttpClient({ baseUrl: 'https://api.samrey.dev' });

const [post, { loading, error, refetch }] = createResource('post-1', async () => {
  return await client.get('/posts/1');
});
```
