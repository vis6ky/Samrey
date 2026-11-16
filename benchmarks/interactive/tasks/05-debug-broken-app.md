# Challenge 05: Debug an Intentionally Broken Application

**Challenge ID:** `TASK-05-DEBUG`  
**Difficulty:** Advanced  
**Domain:** Compiler Error Diagnosis, Anti-Pattern Refactoring & Signal Integrity  
**Target Fixture:** `benchmarks/interactive/fixtures/05-debug-broken-app/`

---

## 1. Overview
In this challenge, you are provided an intentionally broken application containing typical anti-patterns from developers migrating from React or Vue to Samrey:
1. Foreign React hook calls (`useState`, `useEffect`).
2. Prohibited `<Show>` tag inside static template string (compiler error `SAMREY-108`).
3. Direct in-place array mutation on a signal (`todos.value.push(...)`).
4. Re-rendering component functions on state changes.

Your objective is to diagnose the errors and refactor the component into pure, idiomatic Samrey code.

---

## 2. Starting Project
The project is initialized at:
`benchmarks/interactive/fixtures/05-debug-broken-app/`

Contains:
- `package.json`
- `src/BrokenApp.ts` (Broken code to fix)

---

## 3. Exact Task Instructions
1. Open `src/BrokenApp.ts`.
2. Inspect the compilation and runtime errors.
3. Eliminate all foreign hook imports and usages:
   - Replace `useState` with `signal(...)` from `@samrey/reactivity`.
   - Replace `useEffect` with `effect(...)` from `@samrey/reactivity` or reactive bindings.
4. Fix compiler error `SAMREY-108`:
   - Replace raw `<Show>` HTML tags with `Show({ when, children, fallback })` control flow function from `@samrey/runtime`.
5. Fix reactivity breakage:
   - Replace in-place mutation `todos.value.push(item)` with immutable reassignment `todos.value = [...todos.value, item]` or `todos.update(list => [...list, item])`.
6. Hoist invariant HTML templates at module scope with `template(...)`.
7. Ensure `TodoApp()` returns an `HTMLElement` with:
   - Text input (`ref="input"`) and add button (`ref="addBtn"`).
   - Dynamic list rendering (`For(...)` or reactive list container).
   - Empty state message when todos count is 0.
   - Count badge displaying active todos.
8. Export `TodoApp(): HTMLElement`.

---

## 4. Expected Functionality
- Zero compilation errors.
- Adding a todo updates the list and increments the count badge.
- Clicking delete removes the todo item without losing state integrity.
- When all items are removed, an empty state banner is displayed.
- The component runs **exactly once** on creation; DOM nodes update surgically.

---

## 5. Verification Checklist
- [ ] No `useState`, `useEffect`, `useRef`, or `useCallback` anywhere in code.
- [ ] No `<Show>` or `<For>` tags inside template strings.
- [ ] All signal mutations produce new array/object references.
- [ ] Templates hoisted at module scope via `template(...)`.
