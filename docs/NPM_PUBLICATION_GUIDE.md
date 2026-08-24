# Gati Framework — NPM Publication Guide & Release Protocol

**Target Release Version:** `1.0.0-rc.1` (and `1.0.0`)  
**Package Scope:** `@gati/*` (11 packages)  
**Registry:** `https://registry.npmjs.org/`  
**License:** Apache-2.0  

---

## 1. Publication Prerequisites

Before executing any publication command, verify the following:

1. **Authentication:** Ensure you are authenticated with npm using 2FA or a Granular Access Token with publish permissions for the `@aether` organization:
   ```bash
   npm whoami
   ```
2. **Clean Working Tree:** Ensure git status is clean:
   ```bash
   git status
   ```
3. **Full Test Suite & Compilation:**
   ```bash
   npm test
   npx tsc --noEmit
   npm run build
   ```

---

## 2. Dependency-Ordered Publication Pipeline

Due to internal package dependencies, packages must be published in strict topological order to prevent dependency resolution errors for early adopters.

### Tier 1: Zero Internal Dependencies
```bash
# 1. @gati/reactivity (Base reactive engine)
cd packages/reactivity
npm publish --access public --tag next

# 2. @gati/security (Sanitization & Safe URIs)
cd ../security
npm publish --access public --tag next
```

### Tier 2: First-Level Dependencies
```bash
# 3. @gati/runtime (Depends on reactivity, security)
cd ../runtime
npm publish --access public --tag next

# 4. @gati/compiler (Depends on security)
cd ../compiler
npm publish --access public --tag next

# 5. @gati/http (Depends on reactivity, security)
cd ../http
npm publish --access public --tag next

# 6. @gati/devtools (Depends on reactivity)
cd ../devtools
npm publish --access public --tag next

# 7. @gati/ssr (Depends on reactivity, security)
cd ../ssr
npm publish --access public --tag next
```

### Tier 3: High-Level Modules & Tooling
```bash
# 8. @gati/router (Depends on reactivity, runtime, security)
cd ../router
npm publish --access public --tag next

# 9. @gati/forms (Depends on reactivity, runtime)
cd ../forms
npm publish --access public --tag next

# 10. @gati/testing (Depends on reactivity, runtime)
cd ../testing
npm publish --access public --tag next

# 11. @gati/cli (Depends on compiler, runtime, ssr)
cd ../cli
npm publish --access public --tag next
```

---

## 3. Automated Monorepo Publication Script

To automate the sequential publishing process with automated sanity checks, use the provided release script:

```bash
node scripts/publish-packages.mjs --tag rc --dry-run
node scripts/publish-packages.mjs --tag rc
```

---

## 4. Tarball Size & Metric Baseline

| Package | Entry Files | Compressed Tarball Size | Unpacked Size |
| :--- | :--- | :--- | :--- |
| `@gati/reactivity` | 11 | 7.65 kB | 24.19 kB |
| `@gati/runtime` | 11 | 12.31 kB | 44.44 kB |
| `@gati/security` | 7 | 8.48 kB | 24.37 kB |
| `@gati/compiler` | 12 | 15.68 kB | 57.68 kB |
| `@gati/router` | 8 | 6.23 kB | 18.42 kB |
| `@gati/http` | 8 | 6.14 kB | 18.84 kB |
| `@gati/forms` | 8 | 6.59 kB | 19.96 kB |
| `@gati/ssr` | 11 | 13.21 kB | 42.14 kB |
| `@gati/testing` | 6 | 5.24 kB | 14.15 kB |
| `@gati/devtools` | 13 | 9.38 kB | 31.26 kB |
| `@gati/cli` | 18 | 28.37 kB | 110.12 kB |

---

## 5. Rollback & Deprecation Procedures

In the event of an emergency release issue:

```bash
# Deprecate specific version with warning
npm deprecate @gati/runtime@1.0.0-rc.1 "Please upgrade to 1.0.0-rc.2"

# Promote release candidate to latest
npm dist-tag add @gati/cli@1.0.0 latest
```
