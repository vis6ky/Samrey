# Claude & Claude Code Instructions — Samrey Framework (CLAUDE.md)

> **Role**: Guidance tailored for Anthropic Claude (Claude 3.5 Sonnet, Claude 3 Opus) and the Claude Code CLI working within the Samrey framework repository.

---

## 1. Authoritative Specification
Always refer to the single source of truth in [AGENTS.md](AGENTS.md) and the comprehensive [ai/](ai/) specification directory:
- [ai/SPEC.md](ai/SPEC.md): Core framework contracts & zero-VDOM invariants
- [ai/API_CONTRACTS.md](ai/API_CONTRACTS.md): Verified public APIs across all 13 `@samrey/*` packages
- [ai/ERROR_REFERENCE.md](ai/ERROR_REFERENCE.md): Diagnostic codes `SAMREY-101` to `SAMREY-501`
- [ai/EXAMPLES_INDEX.md](ai/EXAMPLES_INDEX.md): Production code examples

---

## 2. Claude-Specific Workflow Optimizations

### Model Context Protocol (MCP) Integration
When running in Claude Code or Claude Desktop with MCP enabled, invoke `@samrey/mcp-server` tools to inspect code and validate architecture:
```json
{
  "mcpServers": {
    "samrey": {
      "command": "npx",
      "args": ["@samrey/mcp-server"]
    }
  }
}
```
Key MCP Tools:
- `samrey_get_project_context`: Discover active routes, packages, and workspace layout in a single round-trip.
- `samrey_get_api_contracts`: Inspect accurate TypeScript signatures before generating code.
- `samrey_validate_code`: Verify syntax and catch foreign framework idioms (React hooks, `<Show>` HTML tags) prior to writing files.
- `samrey_diagnose_errors`: Diagnose and retrieve quick-fixes for compiler errors.

### Subagent & Task Delegation
When coordinating multi-step architectural migrations or complex feature development:
1. Use subagents or targeted tool calls for targeted file reads (`ai/API_CONTRACTS.md`, `ai/COMPONENT_RULES.md`).
2. Always write tests alongside components using `@samrey/testing`.
3. Verify changes with `npx @samrey/cli test` and `npx @samrey/cli check`.

---

## 3. Strict Rules & Anti-Patterns
- ❌ **NEVER use React hooks** (`useState`, `useEffect`, `useMemo`, `useCallback`, `useRef`, `useContext`).
- ❌ **NEVER write `<Show>` or `<For>` as HTML tags**. They are TypeScript functions: `Show({ when, children })`, `For({ each, key, children })`.
- ❌ **NEVER mutate signals in-place** (`arr.value.push(x)`). Always reassign `arr.value = [...arr.value, x]`.
- ❌ **NEVER call signals as functions** (`count()`). Access via `.value` property.
