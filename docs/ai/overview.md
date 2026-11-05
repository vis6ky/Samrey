# Samrey AI Integration — Ecosystem Overview

## Executive Summary

**Samrey AI** is the universal intelligence and development integration layer for the **Samrey** reactive frontend framework.

Unlike legacy frontend frameworks that require extensive prompt engineering or hallucinate React hooks, Samrey provides:
- **Direct Agent Instructions**: Synchronized instruction standards (`AGENTS.md`, `GEMINI.md`, `CLAUDE.md`, `.github/copilot-instructions.md`, `.cursor/rules/samrey.mdc`).
- **Model Context Protocol (MCP) Server**: 18 specialized tools, 8 live resources, and 7 prompts executing over standard I/O (stdio) and remote HTTP/SSE transports.
- **Portable Agent Skills**: 10 Agent Skills following the Agent Skills open standard.
- **In-Memory Semantic & Compiler Validator**: Immediate verification of AI-generated code using `@samrey/compiler`.
- **Architectural Health Inspector**: Real-time detection of foreign framework imports, stale closures, and anti-patterns via `samrey ai doctor`.

---

## Supported AI Platforms & Coding Agents

| Platform / Agent | Integration Mechanism | Tools & Capabilities |
|---|---|---|
| **Google Gemini (CLI & Antigravity)** | MCP Server + \`GEMINI.md\` + Skills | Real-time doc search, project inspection, code validation |
| **Claude (Claude Code & Desktop)** | MCP Server (stdio) + \`CLAUDE.md\` | Full 18 MCP tools, prompt templates, resources |
| **Cursor IDE** | \`.cursor/mcp.json\` + \`.cursor/rules/samrey.mdc\` | Auto-complete, semantic rules, background tool execution |
| **GitHub Copilot** | \`.github/copilot-instructions.md\` + MCP | Contextual repository completions & PR reviews |
| **ChatGPT** | Remote MCP / Custom Actions | Remote SSE endpoint, API reference lookup |
| **Grok** | REST / CLI fallback + \`AGENTS.md\` | Knowledge base search, syntax validation |
| **Windsurf & Other MCP Clients** | Standard MCP stdio / SSE | Universal Model Context Protocol specification |

---

## Core Packages

- **\`@samrey/ai\`**: Core intelligence engine, documentation search, example retrieval, AST validator, compatibility test suite, instruction generator, and portable skills.
- **\`@samrey/mcp-server\`**: High-performance, sandboxed Model Context Protocol server exposing Samrey capabilities over JSON-RPC 2.0.
- **\`@samrey/cli\`**: Extended CLI providing \`samrey ai init\`, \`samrey ai doctor\`, \`samrey ai validate\`, and \`samrey ai mcp\`.

