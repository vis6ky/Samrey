/**
 * @license Apache-2.0
 * Gati Framework — HTTP & Resource Data Fetching Example
 */

import { createResource, HttpClient } from '../../packages/http/src/index.js';

export interface Post {
  id: number;
  title: string;
  body: string;
}

export async function runHttpExample(): Promise<{
  post: Post | null;
  loading: boolean;
  status: string;
}> {
  const resource = createResource<Post>(async () => {
    return {
      id: 1,
      title: 'Fine-Grained Reactivity in Gati',
      body: 'Topological transaction clock prevents all glitches.'
    };
  });

  // Wait for resource to resolve
  let attempts = 0;
  while (resource.loading.value && attempts < 20) {
    await new Promise((r) => setTimeout(r, 10));
    attempts++;
  }

  return {
    post: resource.data.value || null,
    loading: resource.loading.value,
    status: resource.error.value ? 'error' : 'success'
  };
}
