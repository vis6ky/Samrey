# Cursor IDE Integration Guide

Cursor provides seamless native integration with Samrey via `.cursor/rules/samrey.mdc` and `.cursor/mcp.json`.

## Quick Setup

Run inside your Samrey project:

```bash
npx @samrey/cli ai init
```

This generates `.cursor/rules/samrey.mdc` and `.cursor/mcp.json`.

---

## MCP Configuration (`.cursor/mcp.json`)

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

---

## Cursor Rules File (`.cursor/rules/samrey.mdc`)

The `.cursor/rules/samrey.mdc` file instructs Cursor's background agent to:
1. Always use `@samrey/reactivity` and `@samrey/runtime`.
2. Reject React hooks (`useState`, `useEffect`) and Vue directives (`v-if`, `v-for`).
3. Use `signal().value` for reading and writing reactive state.
4. Call `Show({ when, children, fallback })` for conditions and `For({ each, key, children })` for lists.
5. Invoke `samrey_validate_code` to verify any newly generated component.

---

## Example Interaction in Cursor Composer

Open Cursor Composer (`Cmd+I` or `Ctrl+I`) and ask:

> "Create a TodoApp component in Samrey with an input form, add button, and a For list with item deletion."

Cursor will:
- Check `.cursor/rules/samrey.mdc`
- Query `samrey_get_examples` via MCP
- Generate the native component using `template()` and `signal()`
- Validate the generated code with `samrey_validate_code` before presenting it to you

