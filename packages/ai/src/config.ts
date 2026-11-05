/**
 * @license Apache-2.0
 * @samrey/ai - Configuration & Platform Definitions
 */

export type AiPlatform =
  | 'gemini'
  | 'claude'
  | 'chatgpt'
  | 'cursor'
  | 'grok'
  | 'copilot'
  | 'windsurf'
  | 'generic';

export interface SecurityPolicy {
  /** Maximum allowable project directory depth for tool execution */
  maxDepth: number;
  /** Whether command execution (like running tests or build) is permitted */
  allowCommandExecution: boolean;
  /** Whitelist of commands allowed to be executed if command execution is enabled */
  allowedCommands: string[];
  /** Execution timeout in milliseconds */
  commandTimeoutMs: number;
  /** Whether to redact secrets (API keys, authorization headers, private keys) */
  redactSecrets: boolean;
}

export interface AiIntegrationConfig {
  /** Root directory of the project being analyzed */
  projectRoot: string;
  /** Target AI platforms to configure */
  targetPlatforms: AiPlatform[];
  /** Output locations for instruction files */
  instructionPaths: {
    agentsMd: string;
    geminiMd: string;
    claudeMd: string;
    copilotMd: string;
    cursorMdc: string;
  };
  /** Directory where portable agent skills will be written */
  skillsDir: string;
  /** Security and filesystem policy */
  security: SecurityPolicy;
}

export const DEFAULT_SECURITY_POLICY: SecurityPolicy = {
  maxDepth: 10,
  allowCommandExecution: false,
  allowedCommands: [
    'npm test',
    'npm run build',
    'npm run preview',
    'npm run audit',
    'samrey build',
    'samrey test',
    'samrey audit',
    'samrey analyze'
  ],
  commandTimeoutMs: 30000,
  redactSecrets: true
};

export const DEFAULT_AI_CONFIG: AiIntegrationConfig = {
  projectRoot: '.',
  targetPlatforms: ['gemini', 'claude', 'cursor', 'copilot', 'chatgpt', 'windsurf'],
  instructionPaths: {
    agentsMd: 'AGENTS.md',
    geminiMd: 'GEMINI.md',
    claudeMd: 'CLAUDE.md',
    copilotMd: '.github/copilot-instructions.md',
    cursorMdc: '.cursor/rules/samrey.mdc'
  },
  skillsDir: 'skills',
  security: DEFAULT_SECURITY_POLICY
};

export function createAiConfig(overrides: Partial<AiIntegrationConfig> = {}): AiIntegrationConfig {
  return {
    ...DEFAULT_AI_CONFIG,
    ...overrides,
    instructionPaths: {
      ...DEFAULT_AI_CONFIG.instructionPaths,
      ...(overrides.instructionPaths || {})
    },
    security: {
      ...DEFAULT_AI_CONFIG.security,
      ...(overrides.security || {})
    }
  };
}

