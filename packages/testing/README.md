# `@aether/testing`

Deterministic unit testing utilities, component rendering harnesses, and reactivity microtask flushers for Aether.

## Helpers

- `renderTest(factory)`: Mounts component inside a disposable root.
- `flushReactivity()`: Waits for async pending reactivity updates.
- `fireEvent(element, eventName)`: Dispatches synthetic bubbling DOM events.
