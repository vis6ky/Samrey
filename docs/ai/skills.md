# Samrey Agent Skills Specification & Guide

Samrey provides 10 portable agent skills conforming to the Agent Skills open standard. Each skill contains structured metadata frontmatter (`name`, `description`), clear purpose, when-to-use triggers, verified code examples, and validation instructions.

## The 10 Official Samrey Skills

| Skill | Purpose | Key APIs Covered |
|---|---|---|
| **samrey-overview** | Understand zero-VDOM model and compile-time invariants | Architecture, execution lifecycle |
| **samrey-project-creation** | Scaffold projects and configure Vite plugins | \`samrey create\`, templates |
| **samrey-components** | Author native component functions returning DOM | \`template()\`, \`bindText()\`, \`bindAttr()\`, \`on()\` |
| **samrey-reactivity** | Model state with signals, computed values, and stores | \`signal()\`, \`computed()\`, \`effect()\`, \`batch()\` |
| **samrey-routing** | Configure client SPA routes and navigation | \`createRouter()\`, \`RouterView()\`, \`Link()\` |
| **samrey-http** | Fetch async data with reactive resource states | \`createResource()\`, \`createHttpClient()\` |
| **samrey-forms** | Form state, touched tracking, and schema validation | \`createForm()\`, \`Field()\`, Standard Schema |
| **samrey-ssr** | Server-side rendering, streaming, and hydration | \`renderToString()\`, \`renderToStream()\`, \`hydrate()\` |
| **samrey-testing** | Unit and integration test components in headless DOM | \`render()\`, \`fireEvent()\`, \`flushMicrotasks()\` |
| **samrey-debugging** | Resolve compiler errors and reactivity pitfalls | \`SAMREY-101\`..\`SAMREY-108\` error codes |

---

## Installing Skills in a Project

```bash
# Install to ./skills directory
npx @samrey/cli ai skills --install

# List available skills
npx @samrey/cli ai skills
```

