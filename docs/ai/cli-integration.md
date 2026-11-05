# Samrey CLI AI Integration Reference

The Samrey CLI (`@samrey/cli`) provides a suite of dedicated subcommands under `samrey ai` to initialize, diagnose, validate, and serve AI tools.

## Subcommands Overview

### 1. \`samrey ai init\`
Configures the current project with universal instructions (`AGENTS.md`, `GEMINI.md`, `CLAUDE.md`, etc.), Cursor rules, MCP server configuration, and portable skills.

```bash
# Initialize with confirmation
npx @samrey/cli ai init

# Force overwrite existing configs
npx @samrey/cli ai init --force
```

### 2. \`samrey ai doctor\`
Inspects the project structure, checks installed Samrey packages and version, scans for foreign framework idioms (React hooks, Vue directives, in-place array mutations), and calculates an architectural health score (0-100).

```bash
npx @samrey/cli ai doctor

# Output machine-readable JSON
npx @samrey/cli ai doctor --json
```

### 3. \`samrey ai docs <query>\`
Searches framework documentation, API signatures, and error codes directly in the terminal.

```bash
npx @samrey/cli ai docs "signals"
npx @samrey/cli ai docs "Show"
npx @samrey/cli ai docs "createResource"
```

### 4. \`samrey ai validate <file>\`
Validates a TypeScript or JSX component file using `@samrey/compiler` and the semantic anti-pattern linter.

```bash
npx @samrey/cli ai validate src/components/Counter.ts
```

### 5. \`samrey ai mcp\`
Starts the Model Context Protocol (MCP) server over standard input/output (stdio).

```bash
npx @samrey/cli ai mcp
```

### 6. \`samrey ai skills\`
Lists all available portable agent skills or installs them into the project.

```bash
# List skills
npx @samrey/cli ai skills

# Install skills into ./skills
npx @samrey/cli ai skills --install
```

