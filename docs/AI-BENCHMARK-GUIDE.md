# Samrey Multi-Model Benchmark Guide & Methodology (AI-BENCHMARK-GUIDE.md)

**Version:** 2.1.0  
**Authority:** Operator Guide for Running and Reproducing Multi-Model Agent Benchmarks

---

## 1. Overview & Objective

The Samrey Multi-Model Benchmark evaluates real autonomous coding agents (OpenAI GPT-4o, Anthropic Claude 3.5 Sonnet, Google Gemini 1.5 Pro, xAI Grok, and Generic CLI agents) across **20 realistic development challenges**.

Unlike simulated or keyword-matching evaluation suites, this benchmark:
- Executes against **real models** via their official API adapters or CLI wrappers.
- Starts each challenge from an **isolated, clean fixture**.
- Evaluates solutions through **functional execution** using headless test runners.
- Scores candidates using a **multi-dimensional weighted rubric**.
- Reports unconfigured providers strictly as **NOT RUN** with zero fabricated data.

---

## 2. Benchmark Architecture

```
benchmarks/
├── models/
│   └── model-registry.ts           # Pinned model configs, context limits, pricing
├── adapters/
│   ├── base-adapter.ts             # Abstract agent adapter contract
│   ├── openai-adapter.ts           # OpenAI GPT-4o / Codex adapter
│   ├── claude-adapter.ts           # Anthropic Claude 3.5 Sonnet adapter
│   ├── gemini-adapter.ts           # Google Gemini 1.5 Pro / 2.0 adapter
│   ├── grok-adapter.ts             # xAI Grok adapter
│   ├── generic-cli-adapter.ts      # Local / command-line agent adapter
│   └── index.ts                    # Adapter factory
├── challenges/
│   └── index.ts                    # 20 official challenges across all 20 domains
├── evaluators/
│   └── multi-dimensional-evaluator.ts # 8-factor weighted evaluation engine
├── fixtures/
│   ├── saas-dashboard/             # Benchmark App 1: SaaS Administration Dashboard
│   ├── ecommerce-store/            # Benchmark App 2: E-Commerce Storefront
│   └── crm-app/                    # Benchmark App 3: Enterprise CRM Application
├── reports/
│   ├── report-generator.ts         # JSON and Markdown report writer
│   ├── results.json                # Structured execution results
│   └── BENCHMARK-RUN-REPORT.md     # Human-readable markdown summary
└── run-benchmark.ts                # Master CLI benchmark runner
```

---

## 3. The 20 Benchmark Challenge Domains

| # | Domain / Category | Challenge Name | Primary Focus |
| -: | :--- | :--- | :--- |
| **1** | Basic Application Creation | App Bootstrap & Layout | Static template hoisting and root shell |
| **2** | Component Creation | User Card with Refs | Template references (`.refs`) and props |
| **3** | Fine-Grained State | Interactive Counter | `signal()` reading and functional updates |
| **4** | Derived Reactive State | Cart Total Calculator | `computed()` memoization |
| **5** | Component Composition | Master-Detail View | `Show` and `For` function-based control flow |
| **6** | Forms and Validation | Accessible Registration | `createForm` and accessible field errors |
| **7** | Routing | Client Navigation | `createRouter`, `RouterOutlet`, `Link` |
| **8** | Data Fetching | Async Resource Loader | `createResource` loading and error states |
| **9** | Authentication | Auth Session Guard | Signal-driven session status and UI toggle |
| **10** | Authorization | RBAC Directive | Role-based conditional rendering |
| **11** | SSR | Streaming Server Renderer | `renderToString` with HTML wrapper |
| **12** | Hydration | Client Bootstrapper | Client `hydrate()` attaching to server DOM |
| **13** | Error Handling | ErrorBoundary Fallback | `ErrorBoundary` with reset capability |
| **14** | Debugging | Diagnostic Parser | Identifying `SAMREY-108` and foreign hooks |
| **15** | Performance | Batched Mutations | `batch()` to avoid intermediate effect fires |
| **16** | Accessibility | Accessible Modal Dialog | `role="dialog"`, `aria-modal`, and label IDs |
| **17** | Security | Sanitized Comment View | `sanitizeHtml` and `sanitizeUrl` |
| **18** | Refactoring | QuerySelector to Refs | Modernizing DOM lookups to `root.refs` |
| **19** | Framework Migration | React to Samrey | Migrating `useState` and JSX to native Samrey |
| **20** | Full Application | Todo App with Filters | Complete reactive CRUD workflow with filter |

---

## 4. Multi-Dimensional Scoring Rubric

Tasks are evaluated on a 100-point scale across 8 dimensions:

```
Total Score (100%) =
    Functional Correctness       : 30%
  + Build & Type-Check Success   : 15%
  + Correct Samrey API Usage     : 15%
  + Test Coverage & Success      : 10%
  + Security Verification        : 10%
  + Accessibility Verification   :  5%
  + Maintainability & Structure  : 10%
  + Performance Optimization     :  5%
```

A challenge is marked **PASS** only if:
1. Total score is $\ge 70\%$.
2. Functional correctness is $> 0$ (all unit assertions execute and pass).

---

## 5. Execution Guide

### Baseline Self-Test (Zero External Cost)
To verify that the evaluator and all 20 challenge test suites function with 100% precision using the golden reference implementations:
```bash
npx tsx benchmarks/run-benchmark.ts --self-test
```

### Running with a Specific Model
Set the respective API key and target model:
```bash
# OpenAI GPT-4o
export OPENAI_API_KEY="sk-..."
npx tsx benchmarks/run-benchmark.ts --model=gpt-4o

# Anthropic Claude 3.5 Sonnet
export ANTHROPIC_API_KEY="sk-ant-..."
npx tsx benchmarks/run-benchmark.ts --model=claude-3-5-sonnet

# Google Gemini 1.5 Pro
export GEMINI_API_KEY="..."
npx tsx benchmarks/run-benchmark.ts --model=gemini-1-5-pro

# xAI Grok
export XAI_API_KEY="..."
npx tsx benchmarks/run-benchmark.ts --model=grok-beta

# Generic Local Coding Agent
export SAMREY_AGENT_CMD="my-agent-cli solve"
npx tsx benchmarks/run-benchmark.ts --model=generic-cli
```

### Unconfigured Provider Handling
If an API key is not present in the environment:
- The adapter returns status `NOT_RUN`.
- The reason is explicitly noted in both `results.json` and `BENCHMARK-RUN-REPORT.md`.
- No estimated or fabricated scores are generated.

---

## 6. Generated Output Artifacts

Running the benchmark generates two files in `benchmarks/reports/`:
1. **`results.json`**: Machine-readable JSON containing timestamp, model metadata, execution latency, token counts, estimated costs, and per-dimension scores for every challenge.
2. **`BENCHMARK-RUN-REPORT.md`**: Formatted Markdown document with executive summary tables and challenge-by-challenge breakdown.
