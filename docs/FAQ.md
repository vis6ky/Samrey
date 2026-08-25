# Frequently Asked Questions (FAQ)

### Q: Why does Samrey not use a Virtual DOM?
**A:** Virtual DOM diffing carries significant memory and CPU overhead: creating JavaScript object trees, traversing trees recursively, and computing diffs on every render. Samrey leverages fine-grained signal graphs and compiles templates into native C++ `cloneNode(true)` operations with point-to-point text and attribute hole bindings. Updates execute with zero diffing overhead.

---

### Q: How does Samrey prevent glitches in complex reactive state?
**A:** Samrey implements a push-pull topological scheduling algorithm backed by a monotonic transaction clock (`globalClock`). In diamond dependency graphs (where signal `A` feeds computed signals `B` and `C`, which both feed `D`), changes to `A` mark downstream nodes dirty via push, and `D` pulls values in strict topological order. `D` is guaranteed to evaluate exactly once with fully synchronized values of `B` and `C`.

---

### Q: Does Samrey allow `eval()` or `new Function()`?
**A:** No. Samrey enforces a strict **Zero-Eval** security policy across all packages (`@samrey/compiler`, `@samrey/runtime`, `@samrey/ssr`, `@samrey/security`). All templates are pre-compiled or statically parsed, and all SSR hydration payloads are deserialized via prototype-pollution-safe JSON parsers.

---

### Q: How does Samrey protect against secret leakage in SSR?
**A:** When serializing server state with `@samrey/ssr`, the serializer recursively inspects state payloads and strips sensitive property patterns (such as `password`, `secret`, `apiKey`, `token`, `bearer`, `authHeader`, `privateKey`). In strict mode (`strictSecrets: true`), attempting to serialize state containing sensitive keys throws an immediate runtime error.

---

### Q: What browsers are supported?
**A:** Modern evergreen browsers: Chrome 90+, Firefox 90+, Safari 15.4+, and Edge 90+. Legacy browsers without ES2020 support are not supported.
