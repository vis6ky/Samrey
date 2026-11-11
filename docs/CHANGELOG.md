# Changelog — Samrey Framework

All notable changes to the Samrey Framework are documented in this file.
The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [2.1.0] - 2026-11-10

### Added
- **Template References (`root.refs`, `root.ref()`, `root.disposeRefs()`):** Added compile-time typed DOM template refs (`ref="name"`) with `Object.create(null)` reference registries, case-insensitive whitespace-tolerant `hasRefAttr()` detection, O(1) child index paths, automatic `onCleanup` disposal, and browser DOM tests.
- **Compiler Diagnostics (`SAMREY-109` – `SAMREY-111`):** Added compile-time diagnostics for duplicate `ref` names, invalid JS identifier ref names, and unsupported `ref` placement on custom components or control-flow tags.
- **Documentation & Package Exports:** Added `@samrey/security` `sanitizeRedirectUri`, `sanitizeCssStyle`, `sanitizeHeadTags`, `getSamreyTrustedPolicy`, and `getSamreyTemplateTrustedPolicy` API documentation; added `@samrey/ssr` non-destructive hydration and `@samrey/runtime` `on` / `rawHtml` coverage.

### Fixed & Hardened
- **Security (`EXT-001`–`EXT-004`, `NEW-001`–`NEW-003`):** Validated & escaped SSR `scriptId`, routed `samrey#template` Trusted Types policy through `sanitizeTemplateHtml()`, replaced regex HTML sanitization with stateful attribute/tag parser (`sanitizeHtmlString`), upgraded `sanitizeCssStyle` to tokenizer-based CSS escape/comment decoding, extended URL & `srcset` attribute coverage (`sanitizeSrcset`), sanitized `options.headTags` (`sanitizeHeadTags`), escaped SSG XML sitemap URLs, hardened CLI audit & dev server path traversal, and replaced raw `.innerHTML` usage in CLI/docs UI/Markdown renderer with safe DOM construction + Trusted Types.
- **SSR & Hydration:** Implemented non-destructive in-place SSR node adoption (`matchNodeTrees` + `adoptNodeTrees` via `HydrationCaptureRegistry`), `escapeCssIdentifier` replay selector escaping, `abortSignal` / timeout stream teardown, and SSR attribute/slot hydration fixes.
- **TypeScript Strictness, CLI Bundle & Benchmarks:** Enabled `strict: true` in root `tsconfig.json` and `--strict --noUnusedLocals --noUnusedParameters` across all 13 packages; externalized Vite/esbuild peer deps in `@samrey/cli` (`446.8kb` bundle) with native VLQ v3 SourceMap emission; split Vite manual chunks; fixed real OS environment metadata in `benchmarks/runner.ts` and `git archive` sandbox fallback in `benchmarks/check-regression.ts`.

---

## [2.0.0] - 2026-11-04

### Changed
- **Production Release Baseline:** Restricted package imports to built `./dist` artifacts, enforced explicit `initDevTools()`, returned real `HTMLAnchorElement` from `<Link>`, added `SAMREY-108` for `<Show>`/`<For>` template misuse, added real CLI exit codes and directory isolation for `samrey create`, hardened SSR secret stripping and non-throwing `signal.set()`, and migrated starters to pure TypeScript without JSX transforms.

---

## [1.0.0] - 2026-08-21

### Released
- Promoted `@samrey/*` package suite from `1.0.0-rc.1` to `1.0.0` GA.

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
