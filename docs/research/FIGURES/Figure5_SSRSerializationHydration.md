### Figure 5: SSR Streaming & Resumable Micro-Hydration

```mermaid
sequenceDiagram
  autonumber
  participant Client as Browser Client
  participant Server as Samrey SSR Engine
  participant Loader as Async Route Data Loader

  Client->>Server: HTTP GET /dashboard
  Server->>Loader: Execute loader() in parallel
  Server-->>Client: Stream 1: Fast HTML Shell + Loading Skeletons
  Note over Client: Shell renders immediately; user sees content
  Loader-->>Server: Data resolved (e.g. 50ms)
  Server-->>Client: Stream 2: <template id="chunk"> + Unicode Serialized State
  Server-->>Client: Stream 3: Inline Swap Script (<script>swap("chunk")</script>)
  Note over Client: Out-of-order swap swaps skeleton with real content
  Client->>Client: hydrate() resumes signal listeners directly without re-rendering
```
