# Samrey Framework — Authenticated AI Coding Agent Validation Guide

> **Authority**: Canonical standard for evaluating AI coding agents (Antigravity, Gemini CLI, Claude Code, OpenAI Codex, Cursor) developing in Samrey without requiring external provider API keys.

---

## 1. Executive Summary & Design Rationale

Modern software teams rarely develop applications by sending raw programmatic REST calls with pay-per-token API keys. Instead, engineering workflows leverage **authenticated coding environments**:
- **Antigravity IDE** with integrated DeepMind & Gemini agents.
- **Claude Code** and **Gemini CLI** authenticated via local developer sessions.
- **OpenAI Codex** and **GitHub Copilot** integrated into IDEs.

Traditional AI benchmarks often report external models as `NOT_RUN` when direct provider API keys (`OPENAI_API_KEY`, `ANTHROPIC_API_KEY`) are omitted. Treating this as a failure halts real-world validation.

Samrey introduces an **Authenticated AI Agent Validation Framework**:
- Evaluates the **actual code produced** by an AI agent in a real developer workspace.
- Requires **zero external API keys**, credentials, or tokens.
- Provides independent, multi-dimensional verification (compilation, AST checks, hidden tests, accessibility, maintainability).
- Maintains strict category partitions so automated and assisted scores are never conflated.

---

## 2. Architecture: Zero-API-Key Evaluation

The evaluation pipeline separates **code generation** from **code verification**:

```
┌────────────────────────────────────────────────────────┐
│  Agent Execution Environment (Zero Direct API Keys)    │
│  - Antigravity IDE / Google AI Studio                  │
│  - Authenticated Developer CLI (Claude, Gemini, Codex) │
│  - Human-Assisted Interactive Session                  │
└──────────────────────────┬─────────────────────────────┘
                           │ Agent writes code
                           ▼
┌────────────────────────────────────────────────────────┐
│  Isolated Benchmark Fixture (benchmarks/interactive/)  │
│  - Fixture directory with package.json & stubs         │
│  - Complete isolation from other tasks                 │
└──────────────────────────┬─────────────────────────────┘
                           │ Evaluator reads fixture
                           ▼
┌────────────────────────────────────────────────────────┐
│  Independent Samrey Evaluation Engine                  │
│  - Dimension 1: Module Compilation & Type Check (20%) │
│  - Dimension 2: Static Anti-Pattern AST Check (20%)   │
│  - Dimension 3: Hidden Functional Test Suite (40%)    │
│  - Dimension 4: Accessibility & Architecture (20%)    │
└──────────────────────────┬─────────────────────────────┘
                           │ Generates reports
                           ▼
┌────────────────────────────────────────────────────────┐
│  Output Reports & Machine-Readable Artifacts           │
│  - latest-results.json                                 │
│  - Timestamped Run JSON                                │
│  - Dynamic EVALUATION-REPORT.md Scoreboard             │
└────────────────────────────────────────────────────────┘
```

---

## 3. The 3 Execution Categories (Fair Comparison Standard)

To maintain benchmark integrity and eliminate deceptive comparisons, every evaluated run is tagged with one of three official categories:

### Category 1: `fully-automated-cli`
- The task is dispatched to a CLI agent (e.g. `claude`, `gemini`) via standard input or arguments.
- The agent works completely autonomously without human guidance, hints, or review turns.
- Ideal for measuring raw model competence on zero-shot or single-prompt tasks.

### Category 2: `authenticated-ide-agent`
- The task is executed inside an IDE workspace by an autonomous agent (such as Antigravity).
- The agent has full access to the codebase, official Samrey skills, compiler diagnostics, and workspace tools.
- Evaluates realistic developer-assistant velocity in production environments.

### Category 3: `interactive-human-assisted`
- The developer prompts, reviews, asks for refinements, or intervenes during code generation.
- The evaluation records the number of human interventions and correction cycles.
- Useful for measuring paired-programming effectiveness.

> [!IMPORTANT]
> Results across different categories are **never** averaged or merged into a single leaderboard. Each category maintains its own partition in `benchmarks/interactive/reports/EVALUATION-REPORT.md`.

---

## 4. The 5 Real-World Benchmark Challenges

### Challenge 01: Build a Reactive Counter (`TASK-01-COUNTER`)
- **Domain:** Fine-Grained Reactive State Management & Surgical DOM Bindings.
- **Fixture:** `benchmarks/interactive/fixtures/01-reactive-counter/`
- **Skills Tested:**
  - `signal(initial ?? 0)` from `@samrey/reactivity`.
  - Static template hoisting via `template('<div class="counter">...</div>')`.
  - Surgical binding via `bindText(countSpan, () => count.value.toString())`.
  - Event listeners wired with `on(button, 'click', handler)`.
- **Anti-Pattern Gate:** Rejection if React hooks (`useState`) or VDOM patterns are detected.

### Challenge 02: Create Reusable Samrey Components (`TASK-02-COMPONENTS`)
- **Domain:** Component Composition, Dynamic Props & Class Bindings.
- **Fixture:** `benchmarks/interactive/fixtures/02-reusable-components/`
- **Skills Tested:**
  - `Badge` component with variants (`success`, `warning`, `error`).
  - `UserCard` component mounting child `Badge` with dynamic status propagation.
  - Fine-grained `.refs` extraction and surgical updates.

### Challenge 03: Build a Routed Dashboard (`TASK-03-ROUTING`)
- **Domain:** Client-Side Single Page Application Navigation.
- **Fixture:** `benchmarks/interactive/fixtures/03-routed-dashboard/`
- **Skills Tested:**
  - `createRouter()` route table with wildcard 404 fallback.
  - `RouterOutlet()` DOM mounting.
  - `Link()` navigation without triggering full page reloads.

### Challenge 04: Implement Validated Forms (`TASK-04-FORMS`)
- **Domain:** Reactive Form Handling, Field Validation & Two-Way Binding.
- **Fixture:** `benchmarks/interactive/fixtures/04-validated-forms/`
- **Skills Tested:**
  - `createForm()` from `@samrey/forms` with field validators.
  - Two-way input binding via `bindField()`.
  - Error state binding with `bindText(errorSpan, () => field.error.value)`.
  - Accessible ARIA associations (`role="alert"`, `<label>` pairing).

### Challenge 05: Debug an Intentionally Broken Application (`TASK-05-DEBUG`)
- **Domain:** Compiler Diagnostics, Foreign Hook Elimination & Signal Integrity.
- **Fixture:** `benchmarks/interactive/fixtures/05-debug-broken-app/`
- **Skills Tested:**
  - Eliminating foreign React hooks (`useState`, `useEffect`).
  - Resolving compiler error `SAMREY-108` (raw `<Show>` tag inside template string).
  - Replacing in-place array mutation (`.value.push()`) with immutable updates.
  - Implementing zero-VDOM control flow with `Show({ when, children, fallback })`.

---

## 5. Multi-Dimensional Scoring Engine

Every submission is evaluated against 4 quantitative dimensions yielding a score from 0 to 100:

$$\text{Final Score} = \text{Compilation (20)} + \text{AST Cleanliness (20)} + \text{Functional Tests (40)} + \text{Quality \& A11y (20)}$$

1. **Compilation & Type Checking (20 Points)**:
   - Module imports cleanly via TypeScript/ESM.
   - Clean type contracts without broken exports.
2. **Anti-Pattern & AST Cleanliness (20 Points)**:
   - 0 React hooks (`useState`, `useEffect`, `useRef`).
   - 0 raw `<Show>` or `<For>` template tags.
   - 0 in-place signal mutations (`.value.push`).
3. **Hidden Functional Tests (40 Points)**:
   - Automated simulation of user interactions (clicks, keyboard input, form submissions).
   - Verification of DOM state and fine-grained surgical updates.
4. **Accessibility & Code Quality (20 Points)**:
   - Accessible ARIA attributes (`role`, `aria-*`, `<label>`).
   - Proper module-scope static template hoisting (`template(...)`).

---

## 6. Antigravity IDE Workflow Walkthrough

Here is the step-by-step workflow for evaluating Antigravity:

### Step 1: Open Antigravity Workspace
Ensure your workspace is set to the root of the Samrey repository.

### Step 2: Prompt the Agent with Challenge Instructions
Copy the task instructions from `benchmarks/interactive/tasks/` or send:
```text
Please implement Challenge 01 in benchmarks/interactive/fixtures/01-reactive-counter/src/Counter.ts.
Follow all requirements in benchmarks/interactive/tasks/01-reactive-counter.md:
- Use signal() from @samrey/reactivity
- Hoist template() at module scope
- Surgically bind count with bindText()
- Return the cloned element with .refs
```

### Step 3: Antigravity Implements the Component
The agent edits the fixture file `Counter.ts`.

### Step 4: Run Independent Verification
Open the terminal in Antigravity and execute:
```bash
npm run benchmark:interactive -- --task=01 --agent="Antigravity" --category="authenticated-ide-agent"
```

### Step 5: Review Verified Results
The evaluator executes without any external network calls or API keys, prints the score breakdown, and records the run in `benchmarks/interactive/reports/`.

---

## 7. Security & Credential Isolation

- **Zero API Keys**: The evaluation harness never reads, requests, or stores API keys, OAuth tokens, passwords, or cookies.
- **Sandbox Compliance**: All evaluation tests execute in standard headless Node.js environments without elevated privileges or network egress.
- **No Solution Leakage**: Golden reference solutions and hidden test suites are maintained in `benchmarks/interactive/evaluation/` and never copied into the agent's fixture directory.

---

## 8. Verification & Self-Test Proof

To verify that the evaluation engine is functioning properly, run the self-test suite:
```bash
npm run benchmark:interactive:self-test
```
All 5 reference solutions run through the identical evaluation pipeline, verifying that the scoring engine, AST parser, and headless DOM test suites pass with 100% precision.
