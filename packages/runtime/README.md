# `@aether/runtime`

Direct DOM rendering engine, static `<template>` cloning, single-execution component instantiator, and fine-grained hole bindings.

## Exports

- `template(html)`: Native browser `<template>` clone factory.
- `bindText(node, getter)`: Fine-grained text updates.
- `bindAttr(element, attr, getter)`: Context-safe attribute binder.
- `on(target, event, handler)`: Auto-cleanup event listener.
- `createComponent(Component, props)`: Instantiates a single-execution component.
