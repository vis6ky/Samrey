---
name: samrey-debugging
description: Diagnosing compiler errors (SAMREY-101 to SAMREY-501), infinite effect loops, stale closures, and hydration mismatches.
---

# Debugging Samrey Applications (`samrey-debugging`)

## 1. Skill Description & Activation Criteria
- **Purpose**: Diagnostic guide for troubleshooting compilation errors, runtime warnings, infinite reactivity cycles, and hydration issues.
- **Activation Criteria**: Trigger when resolving build errors, troubleshooting unresponsive signal bindings, diagnosing infinite loop warnings, or handling test failures.

## 2. Framework Concepts
- **Compiler Diagnostic System**: Structured error format emitting `[SAMREY-XXX]`, file location, source frame, explanation, and recommendation.
- **Infinite Loop Detection**: Runtimes and effects have transaction cycle limits to prevent browser freezing.
- **Hydration Divergence Detection**: SSR mismatches are flagged in dev mode.

## 3. Correct API Usage
```bash
# Explain a diagnostic code
npx @samrey/cli explain SAMREY-108

# Run automated diagnostic fixer
npx @samrey/cli explain --fix src/MyComponent.ts
```

## 4. Key Error Diagnoses & Quick-Fixes

### SAMREY-108: Control Flow Used as Template Tag
- **Cause**: `<Show>` or `<For>` written inside HTML template markup.
- **Fix**: Replace HTML tag with TypeScript function call:
  ```ts
  Show({
    when: () => isVisible.value,
    children: () => ActiveView(),
    fallback: () => InactiveView()
  });
  ```

### SAMREY-301: Infinite Effect Loop / Cyclic Dependency
- **Cause**: Effect writes to a signal that it also synchronously reads.
- **Fix**: Wrap un-subscribed reads in `untrack(() => signal.value)`.

### Stale Signal Closure / Unresponsive DOM
- **Cause**: Passed static value instead of getter function to dynamic binding:
  ```ts
  // Broken:
  bindText(el, count.value.toString());
  // Fixed:
  bindText(el, () => count.value.toString());
  ```

## 5. Common Mistakes
- **Mistake**: Calling signal as a function: `const val = mySignal()`.
  - *Correction*: Signals in Samrey are objects with a `.value` property. Read `mySignal.value`.
- **Mistake**: In-place array mutation (`arr.value.push(x)`).
  - *Correction*: Reassign reference: `arr.value = [...arr.value, x]`.

## 6. Forbidden Patterns
- ❌ Do NOT suppress compiler errors with `@ts-ignore` without understanding the root cause.
- ❌ Do NOT wrap component bodies in loops.

## 7. Validation Procedures
1. Run `npx @samrey/cli check --json` to diagnose all project files.
2. Run `npm test` to verify fixes.

## 8. Authoritative Documentation
- [ai/ERROR_REFERENCE.md](../../ERROR_REFERENCE.md)
- [ai/REACTIVITY_RULES.md](../../REACTIVITY_RULES.md)
