# Samrey Hydration & Event Replay Example

Demonstrates client-side DOM hydration, Unicode-safe deserialization with secret protection, and zero-drop pre-hydration user event queueing and replay.

## Code Overview

```typescript
import {
  hydrate,
  deserializeHydrationState,
  generatePreHydrationScript
} from '@samrey/ssr';

// 1. Generate ultra-fast <script> to buffer early user clicks before JS bundle finishes loading
const earlyScript = generatePreHydrationScript();

// 2. Deserialize state safely
const serverState = deserializeHydrationState();

// 3. Hydrate DOM nodes surgically
hydrate(container, App);
```
