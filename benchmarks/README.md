# Samrey Performance Benchmarks & Comparative Regression Gate

Samrey enforces zero-regression performance invariants across reactivity, compilation, runtime DOM manipulation, control flow reconciliation, and SSR hydration.

---

## 1. How the Regression Gate Works

The benchmark gate operates in **comparative differential mode** (`--compare <git-ref>`), comparing your working tree directly against a baseline commit or git reference:

1. **Git Worktree Isolation**: The gate checks out the target base ref into a temporary git worktree (`git worktree add --detach <temp-wt> <sha>`). It links host `node_modules` so execution starts immediately without redundant package installations. On completion or interruption (`SIGINT`/`SIGTERM`), the temporary worktree is reliably pruned.
2. **Interleaved Worker Executions**: Rather than running all base tests and then all current tests, the gate runs interleaved batches across fresh worker processes:
   `[Base Run 1] -> [Current Run 1] -> [Base Run 2] -> [Current Run 2] ...`
   This interleaving cancels out shared machine drift such as thermal throttling, dynamic CPU frequency scaling, and background OS interrupts.
3. **Hardware Profile Matching**: Baseline throughput floors (`minOpsPerSec`) are strictly enforced when running on a matching machine profile. When running on different hardware (such as local laptops or varying CI runners), absolute ops/sec floors act as informative warnings (`⚠️ WARN`), while relative percentage regressions (`Δ %`) remain strictly enforced.
4. **Faster-Than-Base Invariant**: Any benchmark row that executes faster than or equal to the base ref (`currentAvgMs <= baselineAvgMs`) **never fails**, even if absolute ops/sec falls below baseline machine expectations.

---

## 2. Statistical Methodology

### Sub-Millisecond Rows (`baseline < 1.0 ms`)
Sub-millisecond benchmarks (e.g. template parsing, single signal updates, DOM text bindings, and secret scrubbing) exhibit high sensitivity to process cold-start JIT tiers and V8 minor GC cycles:

- **Sample Size ($N \ge 9$)**: Comparative runs collect at least 9 independent process runs per side (defaulting to 9).
- **Trimmed Median**: Outliers on both the fast and slow ends are trimmed (`computeTrimmedMedian(arr, 1)` drops the highest and lowest values) before computing the median. This prevents one-off compilation pauses from distorting the median while avoiding the variance of taking an extreme minimum (`min`).
- **Compound Regression Criterion**: A sub-millisecond row flags a regression **only if both the median and the min exceed `maxRegressionPercent`**:
  $$\Delta_{\text{median}} > \text{threshold} \quad \text{AND} \quad \Delta_{\text{min}} > \text{threshold}$$
  If either metric remains within allowed limits, the row passes. This eliminates false regressions caused by asymmetric lower-tail luck on the base side while maintaining 100% detection of true regressions (such as +60% or 2x slowdowns).

### Millisecond Rows (`baseline >= 1.0 ms`)
For benchmarks executing $\ge 1.0\text{ ms}$, process-level jitter is naturally amortized. The standard robust median is used for comparative evaluation.

---

## 3. What to Do When a Row Fails

### Automatic Re-runs
If a benchmark row exceeds its allowed regression threshold during the primary run, the gate does not fail immediately. It automatically spawns fresh worker processes to re-run **only that specific row** up to 2 additional times:
- If a re-run passes, the initial failure is treated as an environmental fluke and the row is marked passed (`✅ PASS`).
- If re-runs confirm the regression, the row is marked confirmed (`❌ FAIL (confirmed)`).
- Re-runs log the exact measured base, current, and delta numbers for each attempt.

### Manual Single-Row Re-run
You can manually re-run a single benchmark against any git reference to inspect its performance in isolation:

```bash
# Re-run a single benchmark row against HEAD~1
npm run benchmark:gate -- --compare HEAD~1 --benchmark "SSR: Secret Scrubbing (500 items deep scan)"

# Re-run a specific benchmark with custom sample count (e.g. 11 runs)
npm run benchmark:gate -- --compare origin/main --runs 11 --benchmark "Show: Repeated Toggling (100 cycles)"

# Re-run an entire category
npm run benchmark:gate -- --compare HEAD~1 --category compiler
```

---

## 4. CI Workflows & Scheduled Sanity Checks

1. **Per-PR CI (`.github/workflows/ci.yml`)**:
   - Compares the PR branch against the target base SHA:
     ```bash
     npm run benchmark:gate -- --compare ${{ github.event.pull_request.base.sha }}
     ```
   - On pushes to main, compares against `HEAD~1`.
2. **Scheduled Sanity Gate (`.github/workflows/benchmark-sanity.yml`)**:
   - Runs nightly at 03:00 UTC and on manual `workflow_dispatch`.
   - Executes 20 self-comparisons against `HEAD` (`npm run benchmark:sanity -- 20`).
   - Configured with a 60-minute job timeout.
   - **Acceptance Criterion**: Passes if at most 1 of 20 self-compares fails ($\le 5\%$ error rate allowance). Any failing rows are captured and reported in the run summary.
