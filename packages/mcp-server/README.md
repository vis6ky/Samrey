# @samrey/mcp-server

Official Model Context Protocol (MCP) Server for the **Samrey** reactive web framework.

## Overview

`@samrey/mcp-server` allows Claude Desktop, Claude Code, Cursor, Gemini CLI, Windsurf, and any other MCP-compliant client to directly interact with a Samrey project.

It provides 17 native tools, 8 resources, and 7 prompts to search documentation, generate native Samrey components, validate code using `@samrey/compiler`, inspect application structure, run tests, and diagnose errors within safe sandboxed boundaries.

## Usage

### Quick Start via npx

```bash
npx @samrey/mcp-server
```

Or through Samrey CLI:

```bash
npx @samrey/cli ai mcp
```

### Configuration Examples

#### Cursor (`.cursor/mcp.json`)
```json
{
  "mcpServers": {
    "samrey": {
      "command": "npx",
      "args": ["-y", "@samrey/mcp-server"]
    }
  }
}
```

#### Claude Desktop (`claude_desktop_config.json`)
```json
{
  "mcpServers": {
    "samrey": {
      "command": "npx",
      "args": ["-y", "@samrey/mcp-server"]
    }
  }
}
```

## License

Apache-2.0

