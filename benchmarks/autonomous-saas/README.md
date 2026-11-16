# Samrey Autonomous SaaS Application Benchmark (`BENCH-SAAS-01`)

> **Autonomous Full-Stack Production Challenge**: Evaluates an AI coding agent's ability to autonomously architect, generate, test, debug, and verify a complete SaaS application in Samrey without human code authoring.

---

## 1. Challenge Overview

This benchmark tests whether an AI agent can build an enterprise-grade SaaS workspace application incorporating:
- **Authentication**: Session state (`currentUser`, `isAuthenticated`), login form, logout action, route protection guard.
- **Responsive Shell**: Sidebar navigation (`Link()`), application header, user status badge.
- **Dashboard**: Real-time reactive KPI metric cards (`computed()`).
- **User Management CRUD**: Reactive user table rendered via `For()`, reactive search filter, role selector, deletion actions.
- **Validated Forms**: Accessible member creation form with field validations and error states via `@samrey/forms`.
- **Analytics View**: Dynamic period switcher (7d, 30d, 90d) with surgical updates.
- **Notification Center**: Global reactive toast system with auto-dismissal.
- **Zero-VDOM Invariants**: Static template hoisting with `template(...)`, surgical fine-grained bindings (`bindText`, `on`), zero React hooks, zero `<Show>` HTML tags.

---

## 2. Directory Structure

```
benchmarks/autonomous-saas/
├── README.md                          # Challenge specification & rubric
├── package.json
├── verify.ts                          # Independent benchmark verification runner
├── benchmark-result.json              # Machine-readable output scores & metrics
├── src/
│   ├── App.ts                         # Main app shell & router table
│   ├── auth/
│   │   └── AuthContext.ts             # Authentication state, login/logout, route guard
│   ├── components/
│   │   ├── Header.ts                  # App header with user badge & logout
│   │   ├── Sidebar.ts                 # Responsive navigation menu
│   │   └── NotificationCenter.ts      # Global reactive toast system
│   ├── services/
│   │   └── UserService.ts             # Reactive mock user service & CRUD API
│   └── views/
│       ├── DashboardView.ts           # KPI metric cards & status
│       ├── UserManagementView.ts      # User table, search/filter, creation form
│       ├── AnalyticsView.ts           # Interactive analytics tabs
│       ├── LoginView.ts               # Authenticated login form
│       └── NotFoundView.ts            # 404 fallback page
└── tests/
    └── saas-app.test.ts               # Comprehensive automated test suite
```

---

## 3. Independent Verification

Run the independent benchmark verification runner:

```bash
npx tsx benchmarks/autonomous-saas/verify.ts
```

The runner evaluates 4 dimensions (100 points total):
1. **AST & Invariants (25 pts)**: Ensures 0 React hooks, 0 `<Show>` tags in templates, 0 in-place mutations.
2. **Compilation & Types (25 pts)**: Validates clean TypeScript module imports.
3. **Functional Tests (30 pts)**: Headless DOM testing of auth, CRUD, search, and navigation.
4. **Accessibility & Standards (20 pts)**: Audits ARIA roles, live regions, labels, and static template hoisting.
