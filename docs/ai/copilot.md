# GitHub Copilot Integration Guide

GitHub Copilot references repository context via `.github/copilot-instructions.md`.

## Setup

Run in your project root:

```bash
npx @samrey/cli ai init
```

This creates `.github/copilot-instructions.md` containing:
- Strict rules against suggesting React hooks or JSX Virtual DOM elements
- Exact API signatures for `@samrey/reactivity`, `@samrey/runtime`, `@samrey/router`, and `@samrey/forms`
- Code snippets demonstrating surgical DOM updates and `Show`/`For` control flow
- Guidance for writing tests using `@samrey/testing`

---

## Editor Autocompletion

With `.github/copilot-instructions.md` in place, Copilot will suggest:

```ts
// Typing:
// function UserItem(props: { user: User }) {
// Copilot suggests:
  const root = _tmpl() as HTMLElement;
  bindText(root.querySelector('.name')!, () => props.user.name);
  return root;
// }
```

Rather than hallucinating `return <div>{props.user.name}</div>` or `useState`.

