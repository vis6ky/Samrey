# Google Gemini & Antigravity Integration Guide

Google Gemini CLI, Gemini Code Assist, and Antigravity natively read `GEMINI.md` and portable skills located in `skills/`.

## Setup

```bash
# Generate GEMINI.md and skills
npx @samrey/cli ai init
```

---

## MCP Server Configuration for Gemini CLI

Add to your `.gemini/mcp.json` or Antigravity configuration:

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

## Gemini Portable Skills

Samrey includes 10 portable skills conforming to the Agent Skills standard:
- `skills/samrey-overview/SKILL.md`
- `skills/samrey-project-creation/SKILL.md`
- `skills/samrey-components/SKILL.md`
- `skills/samrey-reactivity/SKILL.md`
- `skills/samrey-routing/SKILL.md`
- `skills/samrey-http/SKILL.md`
- `skills/samrey-forms/SKILL.md`
- `skills/samrey-ssr/SKILL.md`
- `skills/samrey-testing/SKILL.md`
- `skills/samrey-debugging/SKILL.md`

Gemini will proactively activate the relevant skill based on the task description (e.g. activating `samrey-reactivity` when working with signals or `samrey-debugging` when encountering compiler diagnostics).

