# Aether Framework — Post-Release Validation & Monitoring Protocol

**Version:** 1.0.0-rc.1  
**Scope:** Post-Publish Smoke Tests, Registry Verification & Triage Playbook  
**License:** Apache-2.0  

---

## 1. Registry Availability Smoke Test

Immediately following the publication of `@aether/*` packages to npm, execute the automated registry verification script:

```bash
# Verify registry metadata
npm view @aether/reactivity version
npm view @aether/runtime version
npm view @aether/cli version

# Test global CLI execution
npx @aether/cli@1.0.0-rc.1 --version
npx @aether/cli@1.0.0-rc.1 create quickstart-test --template minimal
```

---

## 2. End-to-End Verification Matrix

| Verification Target | Command / Protocol | Expected Outcome |
| :--- | :--- | :--- |
| **Clean-Room Install** | `mkdir /tmp/test-app && cd /tmp/test-app && npm init -y && npm install @aether/reactivity@1.0.0-rc.1 @aether/runtime@1.0.0-rc.1` | Clean install with 0 peer dependency warnings |
| **Client Hydration** | `npm run build && npm run preview` | Instant hydration, 0 console errors, active reactive signals |
| **Streaming SSR** | `node server.mjs` | First chunk streamed within 10ms, Unicode-safe JSON script payload |
| **Form Validation** | Submit Standard Schema form | Synchronous field validation and asynchronous submission handling |
| **Security Boundaries** | Attempt `<script>` and `javascript:` payload injection | Stripped or sanitized by `@aether/security` without exception |
| **Memory Isolation** | 1,000 component mount/unmount cycles | 0 uncleaned effects, 0 detached DOM leakages |

---

## 3. Post-Release Incident Triage Playbook

### Severity 1: Critical Security or Runtime Defect
- **Action**: Immediate release of patch version (`v1.0.0-rc.2`).
- **Tagging**: Update npm `next` / `latest` tags.
- **Notification**: Post advisory on GitHub Security Advisories.

### Severity 2: Edge Case Compiler/SSR Bug
- **Action**: Create regression test in `tests/`.
- **Resolution**: Provide workaround pattern in GitHub Discussions and release patch in standard release train.
