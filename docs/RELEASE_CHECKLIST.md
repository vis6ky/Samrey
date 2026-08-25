# Samrey Framework — Release Verification Checklist

**Target Version: 1.0.0-rc.1**  
*Maintainer Release Sign-Off Guide*

This checklist ensures strict quality, security, and build integrity before publishing any Samrey release to the public registry.

---

## 1. Codebase & Quality Assurance
- [x] **Zero TypeScript Errors**: Monorepo typechecks cleanly across all packages (`npm run typecheck`).
- [x] **All Tests Passing**: 130/130 tests pass across 38 suites (`npm test`).
- [x] **Production Build Clean**: Production build compiles with zero warnings or errors (`npm run build`).
- [x] **Lint & Format**: Clean AST validation and zero deprecated syntax (`npm run lint`).

---

## 2. Security & Policy Verification
- [x] **Zero Dynamic Code Execution**: Zero instances of `eval()` or `new Function()` in any package.
- [x] **Trusted Types & CSP**: Verified compliance with strict W3C Content Security Policies.
- [x] **Secret Stripping Engine**: Verified Secret Guard filters sensitive credentials from SSR payloads.
- [x] **Apache-2.0 Licensing**: Standard `LICENSE` present in root and all 11 package directories.

---

## 3. Packaging & Distribution Integrity
- [x] **Tarball Inspection (`npm pack`)**: Verified that tarballs contain only production code (`src/`, `bin/`, `README.md`, `LICENSE`, `package.json`) with zero test files, local artifacts, or temporary files.
- [x] **Clean Installation Test**: Verified that an external application can install all 11 packages from tarballs and execute successfully in an isolated directory.
- [x] **Binary Executable Verification**: Verified `aether --help`, `aether --version`, `aether create`, `aether audit` run instantaneously without loaders.

---

## 4. Documentation & Ecosystem Readiness
- [x] **`CHANGELOG.md` Updated**: Comprehensive breakdown of features, changes, and security highlights.
- [x] **`docs/releases/v1.0.0-rc.1.md`**: Official release notes published.
- [x] **`docs/GETTING_STARTED.md` & `docs/API_REFERENCE.md`**: Synchronized with public exports.
- [x] **`docs/COMPATIBILITY.md` & `docs/LIMITATIONS.md`**: Environment matrices and known boundaries documented.
- [x] **`SECURITY.md` & Issue Templates**: Responsible disclosure policy and issue templates active.

---

## 5. Publishing Procedure (When Authorized by Maintainer)
1. Verify clean git working tree: `git status`
2. Run test suites: `npm test`
3. Dry-run publish: `npm publish --dry-run --workspaces`
4. Tag git commit: `git tag -a v1.0.0-rc.1 -m "Release Candidate 1"`
5. Push to registry (Maintainer only): `npm publish --access public --workspaces`
