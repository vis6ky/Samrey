/**
 * @license Apache-2.0
 * @samrey/example-ssg - Static Page Definitions
 */

import { StaticRouteConfig } from '@samrey/ssr';

export const routes: StaticRouteConfig[] = [
  {
    path: '/',
    title: 'Samrey - High Performance Reactive Framework',
    component: () => `
      <main class="max-w-4xl mx-auto py-12 px-6 font-sans">
        <h1 class="text-4xl font-extrabold tracking-tight text-slate-900 mb-4">Samrey Framework</h1>
        <p class="text-lg text-slate-600 mb-8 leading-relaxed">
          The next-generation frontend framework powered by fine-grained signals, direct HTML template cloning, and native W3C security controls.
        </p>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div class="p-6 rounded-lg bg-slate-50 border border-slate-200">
            <h3 class="font-bold text-slate-900 mb-2">Zero VDOM Overhead</h3>
            <p class="text-sm text-slate-600">Native C++ cloneNode(true) and localized text hole bindings.</p>
          </div>
          <div class="p-6 rounded-lg bg-slate-50 border border-slate-200">
            <h3 class="font-bold text-slate-900 mb-2">Built-in Security</h3>
            <p class="text-sm text-slate-600">Trusted Types, automatic URI sanitization, and secret guard protection.</p>
          </div>
          <div class="p-6 rounded-lg bg-slate-50 border border-slate-200">
            <h3 class="font-bold text-slate-900 mb-2">Instant Hydration</h3>
            <p class="text-sm text-slate-600">Non-destructive DOM binding and zero-waterfall server state hydration.</p>
          </div>
        </div>
      </main>
    `
  },
  {
    path: '/docs',
    title: 'Documentation - Samrey Framework',
    component: () => `
      <main class="max-w-4xl mx-auto py-12 px-6 font-sans">
        <h1 class="text-3xl font-bold text-slate-900 mb-4">Samrey Documentation</h1>
        <p class="text-slate-600 mb-6">Explore the architecture, reactivity engine, and SSR workflows.</p>
        <ul class="list-disc pl-6 space-y-2 text-slate-700">
          <li>Reactivity Model (Push-Pull Topological Scheduling)</li>
          <li>Samrey Intermediate Representation (AIR) Compiler</li>
          <li>Static Site Generation (SSG) & Streaming SSR</li>
        </ul>
      </main>
    `
  },
  {
    path: '/blog/:slug',
    component: () => `
      <article class="max-w-3xl mx-auto py-12 px-6 font-sans">
        <header class="mb-8">
          <div class="text-sm text-cyan-600 font-semibold uppercase tracking-wider mb-2">Engineering Blog</div>
          <h1 class="text-3xl font-bold text-slate-900">Post Title</h1>
        </header>
        <div class="prose text-slate-700 leading-relaxed">
          <p>This page was pre-rendered statically at build time using Samrey SSG.</p>
        </div>
      </article>
    `,
    getStaticPaths: () => [
      {
        params: { slug: 'why-signals-matter' },
        title: 'Why Signals Matter - Samrey Blog',
        state: { author: 'Engineering Team', date: '2026-08-19' }
      },
      {
        params: { slug: 'trusted-types-in-practice' },
        title: 'Trusted Types in Practice - Samrey Blog',
        state: { author: 'Security Team', date: '2026-08-18' }
      }
    ]
  },
  {
    path: '404',
    title: '404 - Page Not Found',
    component: () => `
      <div class="min-h-[50vh] flex flex-col items-center justify-center text-center p-6">
        <h1 class="text-6xl font-bold text-slate-800">404</h1>
        <p class="text-slate-600 mt-2">The requested static page could not be found.</p>
      </div>
    `
  }
];
