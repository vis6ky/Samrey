# Samrey Framework: Research Reproducibility Package

**Standard:** ACM Artifact Review and Badging / IEEE Reproducibility Guidelines  
**Artifact Version:** Samrey v1.0.0 (`@samrey/*`)  
**License:** Apache-2.0  
**Repository State:** Frozen Monorepo (`@samrey/monorepo@1.0.0`)

---

## 1. System Requirements & Environment

### Hardware Environment (Recorded Baseline)
- **Architecture:** x86_64 (Linux container)
- **CPUs:** 2 virtualized cores
- **Memory:** 4.00 GB RAM
- **Storage:** ~1 GB free disk space

### Software Prerequisites
- **Node.js:** `>= 18.0.0` (baseline recorded on Node.js `v22.23.1`)
- **Package Manager:** `npm` (v10+) or `bun`
- **TypeScript:** `~5.8.2` (managed via workspace devDependencies)

---

## 2. Workspace Setup & Verification

```bash
# 1. Clone repository
git clone https://github.com/vis6ky/Samrey.git
cd samrey

# 2. Install workspace dependencies
npm install

# 3. Typecheck codebase (Zero TypeScript errors)
npm run lint
```

---

## 3. Reproducing Empirical Results

### 3.1 Reproducing Full Workspace Test Suite (278 Tests, 81 Suites)
```bash
npm test
```
*Expected Result:*
- All functional, security, compiler, runtime, routing, forms, HTTP, and SSR test suites pass.
- Verified test count: 278 automated assertions.
- 0 failed, 0 skipped.

### 3.2 Reproducing 31 Performance Benchmarks
```bash
# Run full automated benchmark suite
npm run benchmark

# Or run domain-specific isolated benchmark suites:
npm run benchmark:compiler     # Compiler parsing and AIR emission
npm run benchmark:reactivity   # Signal mutation, computed diamond, batching
npm run benchmark:runtime      # DOM template cloning, text updates, <For> list
npm run benchmark:ssr          # renderToString, renderToStream, secret scrubbing

# Verify against stored regression thresholds
npm run benchmark:gate
```
*Expected Output:*
- Stored results written to `benchmarks/results.json`.
- All 31 performance benchmarks pass within their defined standard threshold boundaries (`docs/PERFORMANCE.md`).

### 3.3 Reproducing 20-Challenge Developer Assistant Blind Benchmark
```bash
# Execute automated blind challenge benchmark suite
npm run assistant:benchmark
```
*Expected Output:*
```text
==================================================
SAMREY DEVELOPER ASSISTANT — BLIND BENCHMARK REPORT
==================================================
Total Score:              582 / 600 (97%)
Average Score:            29.1 / 30
API Accuracy Rate:        100% (Threshold >= 98%)
Code Compilation Rate:    100% (Threshold >= 95%)
Task Completion Rate:     90% (Threshold >= 90%)
Hallucinated APIs:        0% (Threshold = 0%)
Foreign Framework Usage:  0% (Threshold = 0%)
Aether References:        0 (Threshold = 0)
==================================================
```
- Report regenerated at `docs/DEVELOPER_ASSISTANT_BLIND_BENCHMARK.md`.

---

## 4. Production Build & Release Artifact Packaging

```bash
# 1. Build production documentation web application (100% native Samrey)
npm run build

# 2. Execute release preflight verification
npm run release:validate

# 3. Pack all 11 npm distribution tarballs and verify integrity
npm run release:pack
```

All 11 `.tgz` archives are verified for zero leaks of test files, benchmarks, or sensitive internal data.
