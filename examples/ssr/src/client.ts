/**
 * @license Apache-2.0
 * @gati/example-ssr - Client Hydration Entrypoint
 */

import { signal, effect } from '@gati/reactivity';
import { hydrate, deserializeHydrationState } from '@gati/ssr';
import { App } from './app.js';

function mountClient() {
  const container = document.getElementById('app');
  if (!container) return;

  // Hydrate initial state
  const state = deserializeHydrationState<Record<string, unknown>>();
  console.log('[Gati Client] Hydrated State from Server:', state);

  // Initialize interactive client counter
  const count = signal(0);
  const counterVal = document.getElementById('counter-val');
  const incBtn = document.getElementById('inc-btn');

  if (counterVal && incBtn) {
    effect(() => {
      counterVal.textContent = String(count());
    });

    incBtn.addEventListener('click', () => {
      count.set((prev) => prev + 1);
    });
  }
}

if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mountClient);
  } else {
    mountClient();
  }
}
