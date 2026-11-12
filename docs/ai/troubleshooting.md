# Samrey AI Troubleshooting Guide

Common issues, diagnostics, and step-by-step resolution steps when developing Samrey applications with AI coding assistants.

---

## 1. AI Assistant Keeps Suggesting `useState()` or `useEffect()`

### Symptom:
The AI generates code with:
```ts
// ❌ Symptom: Foreign React hook instead of @samrey/reactivity signal()
import { useState } from 'react'; // or calls useState(0)
```

### Cause:
The assistant has not loaded the project context or `AGENTS.md` / `GEMINI.md` / `CLAUDE.md`.

### Solution:
1. Run:
   ```bash
   npx @samrey/cli ai init --force
   ```
2. Verify that `.cursor/rules/samrey.mdc` exists in Cursor, or `CLAUDE.md` exists for Claude Code.
3. In your prompt, state: *"Use native Samrey signals and template cloning as defined in AGENTS.md. Do not use React."*

---

## 2. Compiler Error `SAMREY-108`: Unsupported template tag `<Show>` or `<For>`

### Symptom:
```
[SAMREY-108] Unsupported template tag <Show>: Template-level control flow is not supported.
```

### Cause:
The AI model wrote `<Show>` or `<For>` as an HTML tag inside template markup:
```html
<div>
  <Show when={isLoggedIn}><span>Welcome</span></Show>
</div>
```

### Solution:
In Samrey, `Show` and `For` are component functions, NOT HTML tags. Call them in TypeScript:
```ts
import { Show } from '@samrey/runtime';

Show({
  when: () => isLoggedIn.value,
  children: () => WelcomeView(),
  fallback: () => LoginPrompt()
});
```

---

## 3. Signal Value Changed, but DOM Did Not Update

### Symptom:
Calling `mySignal.value.push(newItem)` does not update the list on screen.

### Cause:
In-place array mutation does not change the signal's reference, so subscribers are not notified.

### Solution:
Assign a new array reference:
```ts
// ❌ Avoid:
todos.value.push(newTodo);

// ✅ Correct:
todos.value = [...todos.value, newTodo];
// or
todos.update(list => [...list, newTodo]);
```

---

## 4. MCP Server Fails to Connect in Cursor or Claude

### Symptom:
Cursor or Claude reports: `MCP server "samrey" exited with code 1`.

### Solution:
1. Verify Node.js version is >= 18.0.0:
   ```bash
   node -v
   ```
2. Test starting the server directly:
   ```bash
   npx @samrey/cli ai mcp
   ```
3. In `.cursor/mcp.json`, ensure the command is valid:
   ```json
   {
     "mcpServers": {
       "samrey": {
         "command": "npx",
         "args": ["-y", "@samrey/mcp-server"]
       }
     }
   }
   ```

