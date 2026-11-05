# Claude Integration Guide (Claude Code & Claude Desktop)

Claude supports Samrey via project-level `CLAUDE.md` and standard MCP server configuration.

## Claude Desktop Configuration

Add the Samrey MCP server to your `claude_desktop_config.json`:

- **macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Windows**: `%APPDATA%\Claude\claude_desktop_config.json`

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

Restart Claude Desktop. A hammer icon 🔨 will appear, showing the 18 active Samrey tools.

---

## Claude Code (Terminal CLI)

In your project root:

```bash
# Initialize instruction files
npx @samrey/cli ai init

# Start Claude Code
claude
```

Claude Code automatically parses `CLAUDE.md` and discovers:
- Framework overview and zero-VDOM invariants
- Banned foreign framework imports
- Real Samrey code templates for signals, components, and router
- Commands to validate and run tests

---

## Example Prompts for Claude

> "Inspect our project with \`samrey_analyze_project\`, identify any anti-patterns, and generate a new \`UserProfile\` component."

Claude will call the MCP tools, inspect the directory structure, and produce 100% native Samrey code.

