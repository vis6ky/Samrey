# Samrey AI Security & Permissions Model

Allowing an AI model or coding agent access to your development machine requires rigorous, defense-in-depth security boundaries. The Samrey AI ecosystem enforces strict isolation by default.

## 1. Filesystem Path Jailing
- Every file-touching MCP tool and CLI command resolves paths using `resolveSafePath(projectRoot, relativePath)`.
- Directory traversal attacks (e.g. `../../etc/passwd` or `../other-repo`) throw an immediate security exception.
- Paths outside the project root are strictly inaccessible to the MCP client.

## 2. Zero Arbitrary Shell Execution
- The MCP server **NEVER** accepts or executes arbitrary shell strings supplied by an AI model.
- Only safe, whitelisted developer workflows are supported:
  - `npm test`
  - `npm run build`
  - `samrey audit`
- Child processes are executed directly without a shell (`shell: false`), blocking shell injection or variable interpolation vulnerabilities.
- All commands run with configurable timeouts (default: 30,000ms) with automated `SIGKILL` termination on timeout.

## 3. Automated Secret & Token Redaction
- All outputs returned to AI models through MCP tools, resources, or CLI commands pass through `redactSecrets()`.
- Patterns redacted include:
  - Authorization headers and Bearer tokens
  - Google Gemini API keys (`AIza...`)
  - OpenAI API keys (`sk-...`)
  - GitHub personal access tokens (`ghp_...`, `gho_...`)
  - Private keys and passwords

## 4. Read-Only Defaults & Safe Generation
- Informational tools (`samrey_search_docs`, `samrey_analyze_project`, `samrey_detect_version`) are 100% read-only.
- Code generation tools require an explicit `targetPath` to write to disk; otherwise, they return the generated code string for developer review.

