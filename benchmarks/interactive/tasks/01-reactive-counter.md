# Challenge 01: Build a Reactive Counter

**Challenge ID:** `TASK-01-COUNTER`  
**Difficulty:** Beginner  
**Domain:** Fine-Grained Reactive State Management & Surgical DOM Bindings  
**Target Fixture:** `benchmarks/interactive/fixtures/01-reactive-counter/`

---

## 1. Overview
In this challenge, you will implement an interactive counter application in Samrey using native signals from `@samrey/reactivity` and static template hoisting with surgical bindings from `@samrey/runtime`.

---

## 2. Starting Project
The project is initialized at:
`benchmarks/interactive/fixtures/01-reactive-counter/`

Contains:
- `package.json`
- `src/Counter.ts` (Stub to implement)

---

## 3. Exact Task Instructions
1. Open `src/Counter.ts`.
2. Implement and export `Counter(props?: { initial?: number }): HTMLElement`.
3. Requirements:
   - Use `signal(initial ?? 0)` from `@samrey/reactivity` for count state.
   - Hoist the invariant HTML markup at module scope using `template('<div class="counter"><button ref="dec" aria-label="Decrement">-</button><span ref="count"></span><button ref="inc" aria-label="Increment">+</button><button ref="reset">Reset</button></div>')`.
   - Clone the template with `.clone()` and extract element references from `.refs`.
   - Surgically bind the count span with `bindText(countEl, () => count.value.toString())`.
   - Wire event listeners using `on()` from `@samrey/runtime`:
     - Clicking `inc` increments count by 1.
     - Clicking `dec` decrements count by 1.
     - Clicking `reset` resets count to `props.initial ?? 0`.
   - Return the cloned root element.

---

## 4. Expected Functionality
- Initial count displayed inside `<span ref="count">` equals `props.initial` (or `0` if undefined).
- Clicking `+` updates only the text inside the span without re-evaluating the component function.
- Clicking `-` decrements the count.
- Clicking `Reset` restores initial value.

---

## 5. Forbidden Patterns
- ❌ Do NOT use React hooks (`useState`, `useEffect`).
- ❌ Do NOT mutate signals in-place.
- ❌ Do NOT call signals as functions (`count()`). Use `count.value` or `count.update()`.

---

## 6. Test & Evaluation Commands
Run independent evaluation from repo root:
```bash
npx tsx benchmarks/interactive/evaluation/evaluator.ts --task=01 --fixture=benchmarks/interactive/fixtures/01-reactive-counter
```

---

## 7. Submission Instructions
Ensure your solution is written to `benchmarks/interactive/fixtures/01-reactive-counter/src/Counter.ts`. No other files need to be modified.
