# Aether Framework — Migration & Upgrade Guide

**Current Version:** 1.0.0-rc.1  
**License:** Apache-2.0  

---

## 1. Upgrading from Pre-Release Alpha/Beta to `1.0.0-rc.1`

In `1.0.0-rc.1`, all package exports and APIs have been standardized according to `docs/PUBLIC_API.md`:

### Package Version Alignment
Update your `package.json` dependencies to `^1.0.0-rc.1`:

```json
{
  "dependencies": {
    "@aether/reactivity": "^1.0.0-rc.1",
    "@aether/runtime": "^1.0.0-rc.1",
    "@aether/security": "^1.0.0-rc.1",
    "@aether/router": "^1.0.0-rc.1",
    "@aether/forms": "^1.0.0-rc.1",
    "@aether/http": "^1.0.0-rc.1",
    "@aether/ssr": "^1.0.0-rc.1"
  },
  "devDependencies": {
    "@aether/cli": "^1.0.0-rc.1",
    "@aether/compiler": "^1.0.0-rc.1",
    "@aether/testing": "^1.0.0-rc.1",
    "@aether/devtools": "^1.0.0-rc.1"
  }
}
```

---

## 2. API Standardization Notes

1. **Signals & Computed Access:**
   - In Aether, signal and computed values are accessed via `.value`:
     ```ts
     const count = signal(0);
     console.log(count.value); // 0
     count.value = 1;
     ```
2. **Standard Schema Forms:**
   - `@aether/forms` integrates with Standard Schema (~v1) validators (Zod, Valibot, ArkType).
   - Form fields expose reactive `.value` signals:
     ```ts
     const form = createForm({
       initialValues: { name: 'Aether' }
     });
     console.log(form.fields.name.value.value); // 'Aether'
     ```
3. **Control Flow Components:**
   - Use direct-DOM control flow components (`Show`, `For`, `Switch`, `Match`, `ErrorBoundary`):
     ```ts
     Show({
       when: () => isLoggedIn.value,
       fallback: () => el('p', {}, 'Please log in'),
       children: () => el('h1', {}, 'Welcome back!')
     })
     ```
