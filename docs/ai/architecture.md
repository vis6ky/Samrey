# Samrey AI — System Architecture

```mermaid
flowchart TD
    User([Developer / AI Agent]) --> Client[AI Coding Client: Cursor / Gemini / Claude]
    
    subgraph AI Client Layer
        Client --> Instructions[Authoritative Rules: AGENTS.md / GEMINI.md / CLAUDE.md]
        Client --> Skills[Agent Skills: 10 Portable SKILL.md specs]
        Client --> MCPClient[MCP Transport Client]
    end

    subgraph Samrey MCP Server [@samrey/mcp-server]
        MCPClient --> Protocol[JSON-RPC 2.0 Engine]
        Protocol --> Security[Security Sandbox & Path Traversal Guard]
        Protocol --> Tools[18 Native MCP Tools]
        Protocol --> Resources[8 Live Resources samrey://*]
        Protocol --> Prompts[7 Reusable Prompt Templates]
    end

    subgraph Samrey AI Engine [@samrey/ai]
        Tools --> Discovery[Framework & Project Discovery]
        Tools --> DocEngine[Knowledge & Doc Search Engine]
        Tools --> ExEngine[25+ Production Example Engine]
        Tools --> Validator[Code Validator & AST Linter]
        Tools --> Diagnostics[Error Diagnostics & Quick-Fix]
        Tools --> CompatSuite[13-Task Compatibility Benchmark]
    end

    subgraph Samrey Framework Core
        Validator --> Compiler[@samrey/compiler]
        Validator --> SecurityPkg[@samrey/security]
        CompatSuite --> Runtime[@samrey/runtime]
        CompatSuite --> Reactivity[@samrey/reactivity]
        CompatSuite --> Router[@samrey/router]
        CompatSuite --> Forms[@samrey/forms]
        CompatSuite --> Http[@samrey/http]
        CompatSuite --> SSR[@samrey/ssr]
    end
```

## Security & Sandboxing Boundaries

1. **Filesystem Path Jailing**: Operations resolve paths strictly relative to `projectRoot`. Any attempt to escape via `../`, symlinks pointing outside the workspace, or absolute paths outside the root triggers an immediate security error.
2. **Secret Redaction**: All tool outputs, stdout, stderr, and resource payloads are passed through an automated secret scrubber redacting Bearer tokens, API keys, passwords, and authorization headers.
3. **Restricted Command Execution**: The MCP server never runs arbitrary user-supplied shell commands. Only whitelisted commands (`npm test`, `npm run build`, `samrey audit`) are executed with strict timeouts.

