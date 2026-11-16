# Samrey Framework — Autonomous AI Application Development Guide

> **Authority**: Canonical standard for autonomous coding agents developing full-stack applications in Samrey without human code authoring.

---

## 1. Executive Overview

Milestone 3 evolves Samrey from an AI-compatible framework into an **autonomous development engine**. An autonomous AI coding agent using Antigravity, Google AI Studio, Gemini CLI, Claude Code, or OpenAI Codex can:
1. Parse functional requirements from natural language.
2. Inspect the existing project context and dependencies.
3. Architect the application with zero-VDOM invariants.
4. Generate components, routes, models, and forms.
5. Compile and typecheck the codebase.
6. Execute automated unit and integration tests.
7. Diagnose failures and extract root causes.
8. Apply targeted self-corrections without human intervention.
9. Verify regression safety.
10. Generate reproducible execution traces and development reports.

---

## 2. The 12-Stage Autonomous Development Lifecycle

Every autonomous development task advances through a strict, deterministic, state-machine lifecycle:

```
┌───────────┐     ┌───────────┐     ┌───────────┐     ┌───────────┐
│ DISCOVER  │ ──► │  ANALYZE  │ ──► │   PLAN    │ ──► │ GENERATE  │
└───────────┘     └───────────┘     └───────────┘     └───────────┘
                                                            │
┌───────────┐     ┌───────────┐     ┌───────────┐           ▼
│   TEST    │ ◄── │   BUILD   │ ◄── │ VALIDATE  │ ◄─────────┘
└───────────┘
      │
      ├── Pass ───────────────────────────────┐
      │                                       │
      ▼ Fail                                  ▼
┌───────────┐     ┌───────────┐     ┌───────────┐     ┌───────────┐
│ DIAGNOSE  │ ──► │  CORRECT  │ ──► │  RETEST   │ ──► │  VERIFY   │
└───────────┘     └───────────┘     └───────────┘     └───────────┘
                                                            │
                                                            ▼
                                                      ┌───────────┐
                                                      │  REPORT   │
                                                      └───────────┘
```

| Stage | Name | Purpose | Output Artifact |
| :---: | :--- | :--- | :--- |
| **01** | `DISCOVER` | Inspects environment, framework version, zero-VDOM signals runtime | Environment descriptor JSON |
| **02** | `ANALYZE` | Evaluates project structure, installed packages, existing components | Project analysis tree |
| **03** | `PLAN` | Synthesizes architecture, component hierarchy, routes, models, forms | `ApplicationArchitecturePlan` |
| **04** | `GENERATE` | Generates TypeScript components, views, services, tests | Source files (`src/**/*.ts`) |
| **05** | `VALIDATE` | AST static analysis (0 React hooks, 0 `<Show>` tags, immutability) | AST validation result |
| **06** | `BUILD` | Bundles and typechecks the application | Compiler diagnostics |
| **07** | `TEST` | Runs unit, integration, and headless DOM tests | Test execution metrics |
| **08** | `DIAGNOSE` | Pinpoints failure root causes, retrieves official rules | Diagnostic citation |
| **09** | `CORRECT` | Formulates and applies safe patches to source files | Patch record |
| **10** | `RETEST` | Re-executes failing tests to confirm resolution | Retest verification |
| **11** | `VERIFY` | Holistic audit (a11y, ARIA, security sanitization, layout) | Holistic audit result |
| **12** | `REPORT` | Produces structured execution trace and summary | `ExecutionTrace` JSON & markdown |

---

## 3. Persistent Task State & Resumability

All development tasks are tracked via `.samrey/task-<id>.json` to ensure agents can be interrupted, restarted, or resumed across multi-turn sessions without losing context:

```json
{
  "taskId": "TASK-SAAS-01",
  "taskTitle": "Autonomous Enterprise SaaS Application",
  "projectDir": "/path/to/project",
  "currentStage": "GENERATE",
  "status": "IN_PROGRESS",
  "completedStages": ["DISCOVER", "ANALYZE", "PLAN"],
  "outstandingStages": ["GENERATE", "VALIDATE", "BUILD", "TEST", "DIAGNOSE", "CORRECT", "RETEST", "VERIFY", "REPORT"],
  "filesChanged": ["src/App.ts", "src/auth/AuthContext.ts"],
  "diagnostics": [],
  "retryCount": 0,
  "maxRetries": 3,
  "updatedAt": "2026-11-16T11:15:00.000Z"
}
```

---

## 4. MCP Server Integration for Autonomous Agents

Autonomous agents interacting with Samrey via MCP can orchestrate the full lifecycle:

- `samrey_workflow_start`: Initializes or resumes task lifecycle.
- `samrey_workflow_plan`: Generates architecture blueprint from functional requirements.
- `samrey_workflow_status`: Inspects completed stages, outstanding work, and diagnostics.
- `samrey_self_correct`: Executes targeted self-correction loop on failures.
- `samrey_validate_code`: Runs AST anti-pattern scans before writing to disk.
- `samrey_verify_application`: Conducts end-to-end holistic verification.

---

## 5. Security & Authorization Levels

To protect developer repositories, `@samrey/ai-workflow` enforces an authorization hierarchy:

1. `read-only`: Documentation, structure inspection, AST audits.
2. `code-generation`: Generating new components and views.
3. `file-modification`: Editing existing source code for self-correction.
4. `test-execution`: Running test harnesses.
5. `build-execution`: Executing Vite and TypeScript builds.
6. `dependency-install`: Adding npm packages (requires permission).
7. `destructive-operation`: Deleting directories, hard resets (strictly requires explicit human approval).
8. `deployment`: Production deployments (strictly requires human confirmation).
