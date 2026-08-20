/**
 * @license Apache-2.0
 * @aether/example-ssr - Application Component
 */

import { signal } from '@aether/reactivity';
import { createServerData } from '@aether/ssr';

export interface UserFeedItem {
  id: string;
  author: string;
  message: string;
  timestamp: string;
}

export function App() {
  const [count, setCount] = [signal(0), (v: number) => {}];

  // Async server-side data loading
  const [feed, { loading, error }] = createServerData<UserFeedItem[]>('user_feed', async () => {
    return [
      { id: '1', author: 'Linus Torvalds', message: 'Good design is about elimination.', timestamp: 'Just now' },
      { id: '2', author: 'Ada Lovelace', message: 'Mathematical engine operating with fine grain precision.', timestamp: '2m ago' },
      { id: '3', author: 'Grace Hopper', message: 'The most dangerous phrase is: We’ve always done it this way.', timestamp: '5m ago' }
    ];
  });

  const items = feed() || [];

  return `
  <div class="max-w-3xl mx-auto p-6 font-sans bg-slate-900 text-slate-100 rounded-xl shadow-2xl border border-slate-800">
    <header class="border-b border-slate-800 pb-4 mb-6">
      <h1 class="text-3xl font-bold tracking-tight text-cyan-400">Aether SSR Application</h1>
      <p class="text-slate-400 text-sm mt-1">Isomorphic Server Rendering with Zero-Waterfall Client Hydration</p>
    </header>

    <!-- Interactive Hydrated Counter -->
    <section class="bg-slate-800/60 p-5 rounded-lg border border-slate-700/60 mb-6">
      <h2 class="text-lg font-semibold mb-2 text-slate-200">Interactive Counter</h2>
      <div class="flex items-center gap-4">
        <span class="text-2xl font-mono font-bold text-emerald-400" id="counter-val">${count()}</span>
        <button id="inc-btn" class="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded font-medium transition cursor-pointer">
          Increment Counter
        </button>
      </div>
    </section>

    <!-- Pre-loaded Server Feed -->
    <section class="bg-slate-800/60 p-5 rounded-lg border border-slate-700/60">
      <div class="flex justify-between items-center mb-4">
        <h2 class="text-lg font-semibold text-slate-200">Live Activity Feed</h2>
        <span class="text-xs px-2.5 py-1 rounded bg-cyan-950 text-cyan-400 border border-cyan-800/50">SSR Preloaded</span>
      </div>

      <ul class="space-y-3" id="feed-list">
        ${items
          .map(
            (item) => `
          <li class="p-3 bg-slate-900/80 rounded border border-slate-800 flex justify-between items-start">
            <div>
              <div class="font-semibold text-cyan-300 text-sm">${item.author}</div>
              <p class="text-slate-300 text-sm mt-0.5">${item.message}</p>
            </div>
            <span class="text-xs text-slate-500 font-mono">${item.timestamp}</span>
          </li>
        `
          )
          .join('')}
      </ul>
    </section>
  </div>
  `;
}
