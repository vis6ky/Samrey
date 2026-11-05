# ChatGPT & Remote MCP Integration Guide

ChatGPT supports MCP and Custom Actions through remote HTTP/SSE endpoints.

## Remote MCP Deployment

To connect ChatGPT to a Samrey project running in the cloud or across a local network tunnel:

### 1. Launching Remote MCP Server with SSE
```bash
npx @samrey/mcp-server --port 8080 --transport sse
```

### 2. Authentication Requirements
For remote deployments, HTTP Bearer token authentication should be configured in your proxy or reverse tunnel (e.g. Cloudflare Tunnels, ngrok):

```
Authorization: Bearer <YOUR_SECURE_TOKEN>
```

The Samrey MCP server enforces:
- Origin validation
- Safe directory jailing (cannot traverse out of designated project directory)
- Read-only defaults for project files

---

## Custom Action Schema (OpenAPI)
For ChatGPT Custom GPTs that connect via REST OpenAPI actions instead of direct MCP, the `@samrey/ai` documentation engine can be queried via standard HTTP endpoints:

- `GET /api/docs?query=signals` -> `searchDocs(query)`
- `GET /api/examples?domain=reactivity` -> `getExamples(domain)`
- `POST /api/validate` -> `validateSamreyCode(code)`

