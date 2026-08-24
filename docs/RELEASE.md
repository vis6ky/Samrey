# Gati Framework — Release & Publishing Guide

**Target Version:** 1.0.0-rc.1  
**License:** Apache-2.0  
**Registry:** `https://registry.npmjs.org/`  
**Architectural Invariant:** "Gati Must Use Gati"  

---

## 1. Release Architecture & Pipeline Overview

Gati is released as an atomic suite of 11 independent scoped packages under the `@aether` organization:

- `@gati/reactivity` — Fine-grained signal and dependency tracking engine
- `@gati/runtime` — Direct-DOM reactive rendering runtime and control flow
- `@gati/security` — Context-aware HTML sanitization and safe URI enforcement
- `@gati/compiler` — AIR template parser, analyzer, optimizer, and code generator
- `@gati/router` — Client and memory pushState router with typed matching
- `@gati/http` — Reactive resource caching and HTTP client
- `@gati/forms` — Standard Schema form management with accessible field controllers
- `@gati/ssr` — Server-side HTML string rendering, streaming, and hydration state serialization
- `@gati/testing` — DOM container rendering and asynchronous test utilities
- `@gati/devtools` — Reactive graph inspection and performance profiling bridge
- `@gati/cli` — Scaffolding CLI, Vite plugin, and security/a11y linter

---

## 2. Automated Release Pipeline Commands

The monorepo provides automated scripts for running the 7-stage release pipeline:

```bash
# 1. Environment & toolchain readiness check
npm run release:preflight

# 2. Comprehensive manifest, dependency, export, version & license validation
npm run release:validate

# 3. Pack all 11 modules topologically into dist/tarballs
npm run release:pack

# 4. Dry-run publish simulation
npm run release:publish -- --dry-run

# 5. Verify registry metadata and dist-tags
npm run release:verify

# 6. Clean-room consumer & starter template smoke testing
npm run release:smoke

# 7. Generate all release sign-off reports in docs/release/
npm run release:report
```

---

## 3. Release Channels & Safety Rules

- **Release Candidates (`rc`):** Default channel for `1.0.0-rc.1`. Packages are published with `--tag rc` and do not alter the `latest` dist-tag.
  ```bash
  npm run release:rc
  ```
- **Next / Staging (`next`):** For active development and alpha builds.
- **Production Latest (`latest`):** Reserved strictly for stable public releases (`1.0.0`). Requires explicit confirmation flag `--force-latest`.

---

## 4. Release Criteria Gate
Every release candidate must satisfy all automated verification gates:
- Zero foreign framework dependencies (AST and manifest scan)
- 100% export parity with `docs/PUBLIC_API.md`
- Clean-room consumer test passing with 0 monorepo aliases
- 0 blacklisted files (tests, benchmarks, secrets) in generated tarballs
- Apache-2.0 license uniformity across all packages
