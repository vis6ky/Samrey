# Challenge 02: Create Reusable Samrey Components

**Challenge ID:** `TASK-02-COMPONENTS`  
**Difficulty:** Intermediate  
**Domain:** Component Architecture, Template References, Props & Dynamic Styling  
**Target Fixture:** `benchmarks/interactive/fixtures/02-reusable-components/`

---

## 1. Overview
Create a suite of reusable UI primitives in Samrey:
1. `Badge`: Displays a pill tag with dynamic text and variant class (`badge-success`, `badge-warning`, `badge-error`).
2. `UserCard`: Displays user details (name, email, role) using hoisted templates, template references (`.refs`), and embeds a `Badge`.

---

## 2. Starting Project
The project is initialized at:
`benchmarks/interactive/fixtures/02-reusable-components/`

Contains:
- `package.json`
- `src/Badge.ts` (Stub to implement)
- `src/UserCard.ts` (Stub to implement)

---

## 3. Exact Task Instructions

### Part A: `src/Badge.ts`
Implement and export:
```ts
export type BadgeVariant = 'success' | 'warning' | 'error';
export interface BadgeProps {
  label: string;
  variant?: BadgeVariant;
}
export function Badge(props: BadgeProps): HTMLElement;
```
- Hoist static template: `template('<span ref="badge" class="badge"></span>')`.
- Surgically bind text to `props.label`.
- Bind dynamic class: `badge-${props.variant ?? 'success'}` using `bindClass()` or element `classList.add()`.

### Part B: `src/UserCard.ts`
Implement and export:
```ts
export interface UserCardProps {
  name: string;
  email: string;
  role: string;
  status: 'active' | 'suspended';
}
export function UserCard(props: UserCardProps): HTMLElement;
```
- Hoist static template:
  `template('<div ref="card" class="user-card"><h3 ref="name"></h3><p ref="email"></p><div ref="badgeContainer"></div></div>')`
- Surgically bind `name` and `email` text.
- Append a `Badge` into `badgeContainer`:
  - If `status === 'active'`, label is `"Active"`, variant is `'success'`.
  - If `status === 'suspended'`, label is `"Suspended"`, variant is `'error'`.

---

## 4. Expected Functionality
- `Badge` renders a span with text matching `label` and correct CSS variant class.
- `UserCard` correctly renders user profile data with an accessible inner `Badge`.
- Zero runtime DOM reconciliation passes.

---

## 5. Forbidden Patterns
- ❌ Do NOT use `innerHTML` directly with props.
- ❌ Do NOT import React or Vue.

---

## 6. Test & Evaluation Commands
```bash
npx tsx benchmarks/interactive/evaluation/evaluator.ts --task=02 --fixture=benchmarks/interactive/fixtures/02-reusable-components
```
