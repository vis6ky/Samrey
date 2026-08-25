# Changelog — Samrey Framework

All notable changes to the Samrey Framework are documented in this file.
The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [1.0.0-rc.1] - 2026-08-21

### Added
- **11 Native Scoped Packages:** `@samrey/reactivity`, `@samrey/runtime`, `@samrey/security`, `@samrey/compiler`, `@samrey/router`, `@samrey/http`, `@samrey/forms`, `@samrey/ssr`, `@samrey/testing`, `@samrey/devtools`, `@samrey/cli`.
- **Topological Release Pipeline:** Fully automated preflight, package manifest hardening, dependency validation, packaging, clean-room consumer testing, and registry verification scripts in `scripts/release/`.
- **Clean-Room Verification Suite:** Isolated consumer tests verifying pure tarball packaging without monorepo aliases or symlinks.
- **Starter Templates:** 4 production-ready starter templates (`minimal`, `spa`, `ssr`, `ssg`) built with zero foreign framework dependencies.
- **Standard Schema (~v1) Support:** Reactive form field controllers and asynchronous schema validation in `@samrey/forms`.
- **Streaming SSR:** Native WHATWG `ReadableStream` streaming and hydration state serialization in `@samrey/ssr`.
- **Security Primitives:** Defense-in-depth HTML sanitization, safe URI filtering, and prototype pollution protection in `@samrey/security`.

### Changed
- Standardized all package manifests with `publishConfig: { "access": "public" }` and `engines: { "node": ">=18.0.0" }`.
- Upgraded test harness to 162 total unit, integration, and release-gate test suites.
