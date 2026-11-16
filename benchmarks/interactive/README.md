# Samrey Interactive AI Agent Benchmark Suite

> **Zero Direct API Keys Required**: Evaluate and validate AI coding agents using your existing authenticated developer tools, Google AI Studio, Antigravity, Claude Code, or OpenAI Codex.

---

## 1. Overview & Purpose

Traditional AI benchmarks often require separate direct provider API keys (`OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, `GEMINI_API_KEY`). In developer environments where engineers interact with agents through authenticated IDEs (such as Antigravity, Cursor, or VS Code AI plugins) or authenticated CLIs, requiring external API keys is a blocker.

This benchmark suite solves that problem by introducing **Provider-Independent Agent Evaluation**:
- Agents write code inside isolated fixture projects using their natural authenticated interfaces.
- The independent Samrey evaluation engine tests, type-checks, inspects ASTs, and verifies the generated code without ever needing an API key.

---

## 2. Directory Structure

```
benchmarks/interactive/
├── README.md                          # This documentation
├── tasks/                             # Human- & agent-readable task instructions
│   ├── 01-reactive-counter.md         # Fine-grained state & surgical bindings
│   ├── 02-reusable-components.md      # Template hoisting, props & composition
│   ├── 03-routed-dashboard.md         # Client-side routing, RouterOutlet & Link
│   ├── 04-validated-forms.md          # Form validation & two-way field binding
│   └── 05-debug-broken-app.md         # Eliminating foreign hooks & anti-patterns
├── fixtures/                          # Isolated project workspaces for agents
│   ├── 01-reactive-counter/
│   ├── 02-reusable-components/
│   ├── 03-routed-dashboard/
│   ├── 04-validated-forms/
│   └── 05-debug-broken-app/
├── evaluation/                        # Independent evaluation harness
│   ├── adapter.ts                     # Generic agent adapter (Mode A & Mode B)
│   ├── evaluator.ts                   # Multi-dimensional scoring engine
│   ├── reference-solutions/           # Golden implementations for self-test
│   └── tests/                         # Hidden functional test suites
└── reports/                           # Output scores, JSON logs & markdown summary
    ├── EVALUATION-REPORT.md           # Dynamic leaderboard by category
    └── latest-results.json            # Machine-readable per-task scores
```

---

## 3. The 5 Benchmark Challenges

| ID | Title | Difficulty | Core Skills Tested |
| :--- | :--- | :---: | :--- |
| **01** | `TASK-01-COUNTER` | Beginner | `signal()`, `template().clone()`, `bindText()`, `on()` |
| **02** | `TASK-02-COMPONENTS` | Intermediate | Multiple components, class bindings, prop propagation |
| **03** | `TASK-03-ROUTING` | Intermediate | `createRouter()`, `RouterOutlet()`, `Link()`, SPA navigation |
| **04** | `TASK-04-FORMS` | Intermediate | `createForm()`, validation rules, `bindField()`, error states |
| **05** | `TASK-05-DEBUG` | Advanced | Anti-pattern elimination, zero React hooks, `Show()`, immutability |

---

## 4. Execution Modes

### Mode A: Automated CLI Execution
If an authenticated CLI tool is installed locally (e.g. `gemini`, `claude`, `gh copilot`), the benchmark can invoke it non-interactively to generate solutions into the fixture directory.

### Mode B: Interactive IDE Agent (Antigravity Workflow)
This is the recommended workflow for Antigravity, Google AI Studio, or Cursor:

1. **Select a Challenge**: Open the task instructions from `benchmarks/interactive/tasks/` (e.g. `01-reactive-counter.md`).
2. **Copy Task Prompt**: Prompt the agent inside Antigravity:
   > "Implement Challenge 01 in `benchmarks/interactive/fixtures/01-reactive-counter/src/Counter.ts` according to the instructions in `benchmarks/interactive/tasks/01-reactive-counter.md`. Follow Samrey framework invariants: Zero VDOM, static template hoisting, and surgical bindings."
3. **Agent Completes Task**: The agent writes the code directly into the fixture directory.
4. **Run Independent Evaluation**:
   ```bash
   npm run benchmark:interactive -- --task=01 --agent="Antigravity" --category="authenticated-ide-agent"
   ```
5. **View Results**: The score and test details are printed to the console and saved to `benchmarks/interactive/reports/`.

---

## 5. Evaluation Categories

To guarantee fairness and prevent misattribution, results are strictly partitioned into three categories:

1. **`fully-automated-cli`**: Zero human prompts or corrections after initial dispatch.
2. **`authenticated-ide-agent`**: Executed autonomously by an IDE agent (e.g. Antigravity) inside the workspace.
3. **`interactive-human-assisted`**: The developer guided, corrected, or intervened during the development process.

---

## 6. Scoring Dimensions (100 Points Total)

| Dimension | Points | Description |
| :--- | :---: | :--- |
| **Compilation & Loading** | 20 | Clean TypeScript import and type-check without syntax errors. |
| **Anti-Pattern & AST Cleanliness** | 20 | Zero React hooks (`useState`), zero `<Show>` template tags, zero in-place mutations. |
| **Hidden Functional Tests** | 40 | Headless DOM execution of user interactions, state changes, and edge cases. |
| **Accessibility & Code Quality** | 20 | ARIA attributes, semantic HTML, `template(...)` static hoisting. |

**Passing Threshold:** Score $\ge 80/100$ and all functional subtests passing.

---

## 7. Commands

```bash
# Verify evaluator integrity across all 5 reference solutions
npm run benchmark:interactive:self-test

# Evaluate a specific completed fixture task
npm run benchmark:interactive -- --task=01 --agent="Antigravity" --category="authenticated-ide-agent"
npm run benchmark:interactive -- --task=02 --agent="Antigravity" --category="authenticated-ide-agent"
npm run benchmark:interactive -- --task=03 --agent="Antigravity" --category="authenticated-ide-agent"
npm run benchmark:interactive -- --task=04 --agent="Antigravity" --category="authenticated-ide-agent"
npm run benchmark:interactive -- --task=05 --agent="Antigravity" --category="authenticated-ide-agent"
```
