# AI Framework Compatibility & Validation Engine

Samrey includes an automated 13-task compatibility test suite that determines whether an AI coding assistant generates real, valid, compilable, and runnable Samrey code.

## The 13 Core Compatibility Tasks

1. **Create Samrey Application**: Bootstrapping, package dependencies, entrypoint structure.
2. **Reactive Counter**: Signal creation, `.value` read/write, `on()` click handler, `bindText()`.
3. **Reusable Components**: Component factory execution, `createComponent()`, props passing.
4. **Conditional Rendering**: `Show({ when, children, fallback })` reactive branch switching.
5. **Keyed List Rendering**: `For({ each, key, children })` reconciliation with 90%+ node reuse.
6. **Component Communication**: Passing signals and callback handlers between parent and child.
7. **Event Handling**: `on()` event registration, custom dispatch, and event propagation.
8. **Routing**: `createRouter()`, `matchPath()`, dynamic path parameters.
9. **API Data Fetching**: `createResource()`, async resolution, loading and error signals.
10. **Forms with Validation**: `createForm()`, touched state, validation rules, field error display.
11. **Server-Side Rendering**: `renderToString()` producing valid HTML markup.
12. **Write and Execute Tests**: Test execution with `@samrey/testing`, assertions, and microtask flushing.
13. **Build a Production Application**: Full `@samrey/compiler` AOT compilation into standalone ES modules.

---

## Running the Compatibility Suite

Programmatically:
```ts
import { runCompatibilitySuite } from '@samrey/ai';

const report = await runCompatibilitySuite({ platform: 'cursor', model: 'claude-3-5-sonnet' });
console.log('Compatibility Score:', report.overallScore + '%');
console.log('Summary:', report.summary);
```

Via MCP Tool:
```json
{
  "name": "samrey_check_compatibility",
  "arguments": {}
}
```

## Evaluated Criteria Breakdown
- **Connection Compatibility**: Can the AI client connect to the MCP server?
- **Documentation Understanding**: Does the model recognize official Samrey package APIs?
- **Code Generation Correctness**: Did the model avoid foreign React hooks and Vue directives?
- **Successful Compilation**: Does the code compile with `@samrey/compiler` without syntax errors?
- **Runtime Correctness**: Do signals update DOM nodes as expected at runtime?
- **Complete Application Development**: Can the model assemble multi-component full-stack apps?

