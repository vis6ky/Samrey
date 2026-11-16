# Samrey AI Coding Agent Benchmark — Evaluation Report

> **Authority**: Independent verification results for coding agents executing real Samrey tasks.
> **Zero API Keys Required**: Evaluated inside authenticated local developer environments (Antigravity, Gemini, Claude Code, Codex).

## Execution Categories

Results are partitioned strictly by execution category to ensure fair comparison:
1. **Authenticated IDE Agent** (e.g. Antigravity IDE, Gemini inside IDE)
2. **Fully Automated CLI** (e.g. Claude Code, Gemini CLI in headless mode)
3. **Interactive Human-Assisted** (developer prompted or assisted the model)

## Scoreboard

| Task | Agent / Model | Category | Score | Result | Compilation | AST Clean | Tests | A11y / Quality |
| :--- | :--- | :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| **TASK-01-COUNTER** (Build a Reactive Counter) | Antigravity IDE Agent | `authenticated-ide-agent` | **100/100** | ✅ PASS | 20/20 | 20/20 | 40/40 | 20/20 |
| **TASK-02-COMPONENTS** (Create Reusable Samrey Components) | Golden Reference | `authenticated-ide-agent` | **95/100** | ✅ PASS | 20/20 | 20/20 | 40/40 | 15/20 |
| **TASK-03-ROUTING** (Build a Routed Dashboard) | Golden Reference | `authenticated-ide-agent` | **95/100** | ✅ PASS | 20/20 | 20/20 | 40/40 | 15/20 |
| **TASK-04-FORMS** (Implement Validated Forms) | Golden Reference | `authenticated-ide-agent` | **100/100** | ✅ PASS | 20/20 | 20/20 | 40/40 | 20/20 |
| **TASK-05-DEBUG** (Debug an Intentionally Broken Application) | Golden Reference | `authenticated-ide-agent` | **95/100** | ✅ PASS | 20/20 | 20/20 | 40/40 | 15/20 |

---
*Last updated: 2026-11-16T10:55:11.459Z*
