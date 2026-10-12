# Table 6: CLI & Build Tooling Capabilities (`@samrey/cli`)

| Capability Subsystem | Command / API Entry Point | Functional Description | Verification Evidence |
| :--- | :--- | :--- | :--- |
| **Vite Bundler Integration** | `vitePluginSamrey(options)` | Seamless Vite/Rollup compilation plugin converting `.tsx` to AIR and native DOM instructions. | `packages/cli/src/vite.ts`, `packages/cli/tests/cli.test.ts` |
| **Project Scaffolding** | `samrey create <project-name>` | Generates zero-config TypeScript applications with pre-configured routing, forms, and security policies. | `packages/cli/src/scaffold.ts` |
| **Security & A11y Audit** | `samrey audit` | Static AST analysis scanning for un-sanitized dynamic markup, missing ARIA bindings, and prohibited `eval`. | `packages/cli/src/audit.ts` |
| **Route Type Generation** | `samrey typegen` | Inspects directory structure and generates type-safe route parameters and navigation helpers. | `packages/cli/src/typegen.ts` |
| **Monorepo Release Verification** | `npm run release:preflight` | Automated 6-step preflight verification auditing package manifests, dependency graphs, and exports. | `scripts/release/preflight.ts` |
| **Package Tarball Integrity** | `npm run release:pack` | Builds npm `.tgz` distributions and verifies zero test/benchmark file leaks. | `scripts/release/pack.ts` |
