# Challenge 03: Build a Routed Dashboard

**Challenge ID:** `TASK-03-ROUTING`  
**Difficulty:** Intermediate  
**Domain:** Client-Side Single-Page Routing with Outlets & Links  
**Target Fixture:** `benchmarks/interactive/fixtures/03-routed-dashboard/`

---

## 1. Overview
Build a client-routed multi-page dashboard layout using `@samrey/router` and `@samrey/runtime`.

---

## 2. Starting Project
The project is initialized at:
`benchmarks/interactive/fixtures/03-routed-dashboard/`

Contains:
- `package.json`
- `src/DashboardRouter.ts` (Stub to implement)

---

## 3. Exact Task Instructions
Open `src/DashboardRouter.ts`. Implement and export:
1. Three page view component functions:
   - `OverviewView()`: Returns `template('<div class="page-overview"><h2>System Overview</h2></div>')()`
   - `SettingsView()`: Returns `template('<div class="page-settings"><h2>Account Settings</h2></div>')()`
   - `NotFoundView()`: Returns `template('<div class="page-404"><h2>Page Not Found</h2></div>')()`
2. Router table instance `router`:
   - Configured with `createRouter([ ... ])` mapping:
     - `'/'` -> `OverviewView`
     - `'/settings'` -> `SettingsView`
     - `'*'` -> `NotFoundView`
3. Layout component `DashboardLayout()`:
   - Hoists template:
     `template('<div class="dashboard-shell"><nav ref="nav"></nav><main ref="outlet"></main></div>')`
   - Clones template and accesses `nav` and `outlet` references.
   - Appends navigation links into `nav` using `Link()` from `@samrey/router`:
     - `Link({ href: '/', children: 'Overview' })`
     - `Link({ href: '/settings', children: 'Settings' })`
   - Appends `RouterOutlet()` into `outlet`.
   - Returns root element.

---

## 4. Expected Functionality
- `DashboardLayout` renders navigation links and mounts `RouterOutlet()`.
- Navigation between `/` and `/settings` switches view content client-side without full browser page reloads.

---

## 5. Forbidden Patterns
- ❌ Do NOT use raw `<a href="...">` for internal links (causes page reload).
- ❌ Do NOT import React Router.

---

## 6. Test & Evaluation Commands
```bash
npx tsx benchmarks/interactive/evaluation/evaluator.ts --task=03 --fixture=benchmarks/interactive/fixtures/03-routed-dashboard
```
