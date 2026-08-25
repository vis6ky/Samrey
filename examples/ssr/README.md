# Samrey SSR Example

This example demonstrates server-side rendering (SSR) in Samrey with automatic state serialization, secret leakage protection, and client-side hydration.

## Features

- **Server-Side Data Loading (`createServerData`)**: Loads data asynchronously on the server and embeds it directly into the initial HTML response.
- **Zero Waterfall Hydration**: Client signals read immediately from the serialized payload with no additional network request on startup.
- **Secret Guard Protection**: Automatically strips sensitive fields (e.g. `apiKey`, `password`, `tokens`) before rendering the client `<script id="__SAMREY_STATE__">`.
- **Pre-Hydration Event Capture**: Lightweight inline delegator records user clicks before the JavaScript bundle finishes downloading, and replays them immediately upon hydration.

## Running

```bash
npm run start
```
