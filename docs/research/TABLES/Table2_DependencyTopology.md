# Table 2: Monorepo Package Dependency Topology & Layering

| Package | Layer Tier | Internal Workspace Dependencies (`@samrey/*`) | External Production Runtime Dependencies | External Build / Dev Tooling |
| :--- | :---: | :--- | :---: | :--- |
| **`@samrey/reactivity`** | **Tier 0** (Base) | *None* (Strictly Zero) | **0** | `typescript`, `@types/node` |
| **`@samrey/security`** | **Tier 0** (Base) | *None* (Strictly Zero) | **0** | `typescript`, `@types/node` |
| **`@samrey/runtime`** | **Tier 1** (Core) | `@samrey/reactivity`, `@samrey/security` | **0** | `typescript`, `@types/node` |
| **`@samrey/compiler`** | **Tier 1** (Core) | `@samrey/security` | **0** | `typescript`, `esbuild` |
| **`@samrey/router`** | **Tier 2** (App Infra) | `@samrey/reactivity`, `@samrey/runtime`, `@samrey/security` | **0** | `typescript`, `@types/node` |
| **`@samrey/http`** | **Tier 2** (App Infra) | `@samrey/reactivity`, `@samrey/security` | **0** | `typescript`, `@types/node` |
| **`@samrey/forms`** | **Tier 2** (App Infra) | `@samrey/reactivity`, `@samrey/runtime` | **0** | `typescript`, `@types/node` |
| **`@samrey/ssr`** | **Tier 2** (App Infra) | `@samrey/reactivity`, `@samrey/security` | **0** | `typescript`, `@types/node` |
| **`@samrey/testing`** | **Tier 3** (Developer) | `@samrey/reactivity`, `@samrey/runtime` | **0** | `typescript`, `node:test` |
| **`@samrey/devtools`** | **Tier 3** (Developer) | `@samrey/reactivity` | **0** | `typescript`, `@types/node` |
| **`@samrey/cli`** | **Tier 3** (Developer) | `@samrey/compiler` | **0** | `typescript`, `vite` |
