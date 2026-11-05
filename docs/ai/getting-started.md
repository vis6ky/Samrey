# Getting Started with Samrey AI

Get your Samrey project configured for any AI coding assistant in 60 seconds.

## Step 1: Initialize AI Tooling in Your Project

In your Samrey application directory, execute:

```bash
npx @samrey/cli ai init
```

This automatically generates:
- `AGENTS.md` (universal instructions)
- `GEMINI.md` (Google Gemini configuration)
- `CLAUDE.md` (Claude Code & Anthropic projects)
- `.github/copilot-instructions.md` (GitHub Copilot instructions)
- `.cursor/rules/samrey.mdc` (Cursor IDE rules)
- `.cursor/mcp.json` (MCP server configuration)
- `skills/` (10 portable agent skills)

---

## Step 2: Verify Project AI Readiness

Run the diagnostic doctor to inspect project health and verify zero anti-patterns:

```bash
npx @samrey/cli ai doctor
```

Output:
```
=====================================================
🔍 Samrey AI Doctor — Environment & Project Inspection
=====================================================
Project:           my-app (v2.0.0)
Samrey Version:    2.0.0 (Valid Samrey Project)
Health Score:      100/100
Components Found:  12
Routes Found:      4
...
```

---

## Step 3: Launch with Your Preferred AI Client

### Cursor
Open the project directory in Cursor. Cursor will automatically detect `.cursor/mcp.json` and `.cursor/rules/samrey.mdc`.
In the Cursor chat, type:
> "Build a responsive UserSettings component with email validation and a dark mode toggle in Samrey."

### Claude Code
Start Claude Code in the project root:
```bash
claude
```
Claude will automatically read `CLAUDE.md` and connect to the `@samrey/mcp-server`.

### Gemini CLI / Antigravity
Open the project in Gemini CLI or Antigravity. Gemini will read `GEMINI.md` and load the portable skills.

