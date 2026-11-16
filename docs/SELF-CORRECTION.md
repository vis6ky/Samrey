# Samrey Framework — Autonomous Self-Correction Engine

> **Authority**: Operational manual for the closed-loop failure diagnosis, root cause extraction, and safe remediation engine in Samrey.

---

## 1. Principles of Autonomous Self-Correction

Self-correction is not random trial-and-error. In Samrey, autonomous self-correction adheres to four non-negotiable architectural invariants:

1. ❌ **Never Invent APIs**: All proposed corrections must reference canonical `@samrey/*` packages and APIs listed in `ai/API_CONTRACTS.md`.
2. ❌ **Never Silently Suppress Errors**: Agents must fix the underlying logic; wrapping failing blocks in empty `try/catch` or ignoring diagnostic warnings is prohibited.
3. ❌ **Never Remove Failing Tests**: Tests define the specification contract. Deleting or weakening assertions to achieve a passing score is classified as test tampering.
4. ❌ **Never Claim Success Without Retesting**: Every applied patch must be verified by re-executing the failing test suite and confirming zero regressions across previously passing tests.

---

## 2. Failure Diagnosis Patterns

The `@samrey/ai-workflow` self-correction engine recognizes primary anti-patterns and maps them directly to canonical Samrey documentation:

### Pattern A: Foreign React Hooks
- **Symptoms**: `useState`, `useEffect`, `useRef`, `useCallback`, `useMemo` imports or calls.
- **Root Cause**: Developer or LLM applying React paradigms in a zero-VDOM framework.
- **Rule Citation**: `ai/REACTIVITY_RULES.md` — Section 2: Prohibited Foreign Framework Idioms.
- **Remediation**:
  ```ts
  // ❌ Prohibited
  import { useState, useEffect } from 'react';
  const [count, setCount] = useState(0);

  // ✅ Samrey Idiomatic
  import { signal, effect } from '@samrey/reactivity';
  const count = signal(0);
  ```

### Pattern B: Compiler Error `SAMREY-108` (<Show> or <For> Template Tag)
- **Symptoms**: `<Show when="...">` or `<For each="...">` inside HTML template strings.
- **Root Cause**: Confusing functional control flow components with JSX or HTML tags.
- **Rule Citation**: `ai/COMPONENT_RULES.md` — Control Flow Functions vs HTML Tags.
- **Remediation**:
  ```ts
  // ❌ Prohibited
  template('<div><Show when="isLoggedIn"><span>User</span></Show></div>');

  // ✅ Samrey Idiomatic
  const root = _tmpl.clone();
  root.appendChild(Show({
    when: () => isLoggedIn.value,
    children: () => _userTmpl(),
    fallback: () => _guestTmpl()
  }));
  ```

### Pattern C: In-Place Signal Mutation
- **Symptoms**: `items.value.push(x)`, `items.value.splice(...)`, `items.value.sort(...)`.
- **Root Cause**: In-place mutation does not change object identity, preventing fine-grained subscribers from receiving notification.
- **Rule Citation**: `ai/REACTIVITY_RULES.md` — Section 3: Signal Immutability.
- **Remediation**:
  ```ts
  // ❌ Prohibited
  todos.value.push(newTodo);

  // ✅ Samrey Idiomatic
  todos.update(list => [...list, newTodo]);
  // Or
  todos.value = [...todos.value, newTodo];
  ```

### Pattern D: Calling Signals as Functions
- **Symptoms**: `count()`, `SAMREY-101`, `TypeError: count is not a function`.
- **Root Cause**: Confusing Solid.js function-based signals with Samrey property-based signals (`.value`).
- **Rule Citation**: `ai/REACTIVITY_RULES.md` — Section 1: Signal Value Access.
- **Remediation**:
  ```ts
  // ❌ Prohibited
  console.log(count());

  // ✅ Samrey Idiomatic
  console.log(count.value);
  ```

---

## 3. Thrash Detection & Escalation Policy

To prevent infinite correction loops or oscillating between two invalid fixes:

1. **Retry Budget**: Maximum of 3 automated correction attempts per task.
2. **Loop Detection**: The engine tracks hash signatures of previous errors and attempted fixes. If an identical fix failed in an earlier attempt, the engine immediately halts.
3. **Automatic Reversion**: If a proposed fix causes new test failures or breaks previously working suites, the patch is automatically reverted.
4. **Human Escalation**: If the retry budget is exceeded or loop thrashing is detected, the task status transitions to `ESCALATED`, prompting the human developer with a diagnostic summary and error stack trace.
