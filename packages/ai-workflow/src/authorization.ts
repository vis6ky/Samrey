/**
 * @license Apache-2.0
 * Samrey Framework — Autonomous Development Security & Authorization Engine
 */

export enum AuthorizationLevel {
  READ_ONLY = 'read-only',
  CODE_GENERATION = 'code-generation',
  FILE_MODIFICATION = 'file-modification',
  TEST_EXECUTION = 'test-execution',
  BUILD_EXECUTION = 'build-execution',
  DEPENDENCY_INSTALL = 'dependency-install',
  DESTRUCTIVE_OPERATION = 'destructive-operation',
  DEPLOYMENT = 'deployment'
}

export interface PermissionCheckResult {
  allowed: boolean;
  requiresApproval: boolean;
  requiredLevel: AuthorizationLevel;
  currentLevel: AuthorizationLevel;
  reason?: string;
}

const LEVEL_HIERARCHY: Record<AuthorizationLevel, number> = {
  [AuthorizationLevel.READ_ONLY]: 1,
  [AuthorizationLevel.CODE_GENERATION]: 2,
  [AuthorizationLevel.FILE_MODIFICATION]: 3,
  [AuthorizationLevel.TEST_EXECUTION]: 4,
  [AuthorizationLevel.BUILD_EXECUTION]: 5,
  [AuthorizationLevel.DEPENDENCY_INSTALL]: 6,
  [AuthorizationLevel.DESTRUCTIVE_OPERATION]: 7,
  [AuthorizationLevel.DEPLOYMENT]: 8
};

// Actions that strictly require human confirmation regardless of agent privilege
const SENSITIVE_ACTIONS = new Set<string>([
  'delete-directory',
  'format-database',
  'reset-hard',
  'install-untrusted-package',
  'publish-npm',
  'production-deploy'
]);

export class SecurityPolicy {
  constructor(private currentLevel: AuthorizationLevel = AuthorizationLevel.BUILD_EXECUTION) {}

  getLevel(): AuthorizationLevel {
    return this.currentLevel;
  }

  setLevel(level: AuthorizationLevel): void {
    this.currentLevel = level;
  }

  checkPermission(action: string, requiredLevel: AuthorizationLevel): PermissionCheckResult {
    const isSensitive = SENSITIVE_ACTIONS.has(action);
    const hasRank = LEVEL_HIERARCHY[this.currentLevel] >= LEVEL_HIERARCHY[requiredLevel];

    if (isSensitive) {
      return {
        allowed: false,
        requiresApproval: true,
        requiredLevel,
        currentLevel: this.currentLevel,
        reason: `Action "${action}" is marked as sensitive and requires explicit human approval.`
      };
    }

    if (!hasRank) {
      return {
        allowed: false,
        requiresApproval: true,
        requiredLevel,
        currentLevel: this.currentLevel,
        reason: `Action "${action}" requires authorization level "${requiredLevel}", but current level is "${this.currentLevel}".`
      };
    }

    return {
      allowed: true,
      requiresApproval: false,
      requiredLevel,
      currentLevel: this.currentLevel
    };
  }

  /**
   * Redacts potential secrets, credentials, tokens, and private keys from logs and traces.
   */
  sanitizeOutput(text: string): string {
    if (!text || typeof text !== 'string') return text;

    return text
      .replace(/(?:ghp|gho|ghu|ghs|ghr)_[A-Za-z0-9_]{36,}/g, '[REDACTED_GITHUB_TOKEN]')
      .replace(/AIzaSy[A-Za-z0-9-_]{33}/g, '[REDACTED_GOOGLE_API_KEY]')
      .replace(/sk-[A-Za-z0-9]{20,}/g, '[REDACTED_OPENAI_KEY]')
      .replace(/sk-ant-[A-Za-z0-9-_]{20,}/g, '[REDACTED_ANTHROPIC_KEY]')
      .replace(/(?:xai)-[A-Za-z0-9]{20,}/g, '[REDACTED_XAI_KEY]')
      .replace(/npm_[A-Za-z0-9]{36}/g, '[REDACTED_NPM_TOKEN]')
      .replace(/Bearer\s+[A-Za-z0-9._~+/-]+=*/gi, 'Bearer [REDACTED_BEARER_TOKEN]')
      .replace(/password\s*[:=]\s*["'][^"']+["']/gi, 'password: "[REDACTED_PASSWORD]"');
  }
}
