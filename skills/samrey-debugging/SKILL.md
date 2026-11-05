---
name: samrey-debugging
description: Diagnose compiler errors (SAMREY-101 to SAMREY-108), reactivity pitfalls, and runtime exceptions.
---

# Debugging Samrey Applications & Compiler Errors

## Purpose
Guides resolving compiler diagnostics, runtime issues, and anti-pattern warnings.

## Compiler Error Codes
- **SAMREY-101**: Unclosed HTML/JSX tag.
  - *Fix*: Check line & column reported in the error frame and add matching closing tag.
- **SAMREY-102**: Unterminated interpolation expression `{...`.
  - *Fix*: Ensure matching closing brace `}`.
- **SAMREY-104**: Mismatched or unexpected closing tag.
  - *Fix*: Match opening tag or remove extraneous closing tag.
- **SAMREY-108**: Template-level `<Show>` or `<For>` tag used in HTML template.
  - *Fix*: Call them as component functions in TypeScript: `Show({ when, children })` or `For({ each, key, children })`.

## Reactivity Debugging
- **Issue**: "Signal was updated but DOM did not change."
  - *Cause*: State was mutated in-place (e.g. `arr.value.push(x)`), or signal was read outside a reactive binding.
  - *Fix*: Assign new reference `arr.value = [...arr.value, x]` and verify binding is wrapped in a getter function `() => signal.value`.
- **Issue**: Infinite effect loop.
  - *Cause*: Writing to a signal inside an effect that also reads the same signal.
  - *Fix*: Wrap the read in `untrack(() => signal.value)`.
