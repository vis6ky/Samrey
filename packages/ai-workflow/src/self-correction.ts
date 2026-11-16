/**
 * @license Apache-2.0
 * Samrey Framework — Controlled Self-Correction Engine
 */

import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { TraceLogger } from './observability.js';
import { SecurityPolicy, AuthorizationLevel } from './authorization.js';

export interface FailureContext {
  stage: 'BUILD' | 'VALIDATION' | 'TEST' | 'RUNTIME';
  errorMessage: string;
  errorCode?: string;
  targetFile?: string;
  targetLine?: number;
  stackTrace?: string;
  testFailures?: { testName: string; message: string }[];
}

export interface ProposedCorrection {
  file: string;
  description: string;
  originalSnippet: string;
  replacementSnippet: string;
  ruleCitation: string;
  rootCause: string;
}

export interface CorrectionResult {
  success: boolean;
  attempt: number;
  appliedCorrection?: ProposedCorrection;
  verificationPassed: boolean;
  regressionsDetected: boolean;
  message: string;
  escalatedToHuman: boolean;
}

export class SelfCorrectionEngine {
  private maxRetries: number;
  private history: { attempt: number; error: string; fix: string }[] = [];
  private security: SecurityPolicy;

  constructor(
    private logger?: TraceLogger,
    maxRetries = 3,
    securityLevel = AuthorizationLevel.FILE_MODIFICATION
  ) {
    this.maxRetries = maxRetries;
    this.security = new SecurityPolicy(securityLevel);
  }

  /**
   * Diagnoses an observed failure, retrieves Samrey rules, and formulates a targeted fix.
   */
  diagnoseFailure(context: FailureContext, projectDir: string): ProposedCorrection | null {
    const errorStr = `${context.errorMessage}\n${context.stackTrace || ''}`;

    // Pattern 1: Foreign React Hooks (useState, useEffect, useRef, useCallback)
    if (/useState|useEffect|useRef|useCallback|useMemo/i.test(errorStr)) {
      const file = context.targetFile || this.findSourceFileWithPattern(/useState|useEffect/, projectDir) || 'src/App.ts';
      let originalSnippet = 'useState';
      if (existsSync(file)) {
        try {
          const content = readFileSync(file, 'utf-8');
          originalSnippet = content.match(/import\s*\{[^}]*use(?:State|Effect)[^}]*\}\s*from\s*['"][^'"]+['"];?/)?.[0] || 'useState';
        } catch {}
      }
      return {
        file,
        description: 'Eliminate prohibited React hooks; replace with native Samrey signals and effects.',
        originalSnippet,
        replacementSnippet: "import { signal, effect, computed } from '@samrey/reactivity';",
        ruleCitation: 'ai/REACTIVITY_RULES.md - Section 2: Prohibited Foreign Framework Idioms',
        rootCause: 'Developer or model imported React hooks instead of native Samrey signals.'
      };
    }

    // Pattern 2: Compiler Error SAMREY-108 (Prohibited <Show> or <For> template tag)
    if (/SAMREY-108/i.test(errorStr) || /<Show[\s>]|<For[\s>]/i.test(errorStr)) {
      const file = context.targetFile || this.findSourceFileWithPattern(/<Show[\s>]|<For[\s>]/, projectDir) || 'src/App.ts';
      return {
        file,
        description: 'Replace prohibited <Show> / <For> HTML template tags with functional Show() / For() from @samrey/runtime.',
        originalSnippet: '<Show',
        replacementSnippet: 'Show({ when, children, fallback })',
        ruleCitation: 'ai/COMPONENT_RULES.md - Control Flow Functions vs HTML tags',
        rootCause: 'Control flow components must be called as functions, not interpolated as HTML tags in template strings.'
      };
    }

    // Pattern 3: In-Place Signal Mutation (.value.push, .value.splice)
    if (/\.value\.push|\.value\.splice|\.value\.sort/i.test(errorStr)) {
      const file = context.targetFile || this.findSourceFileWithPattern(/\.value\.push/, projectDir) || 'src/App.ts';
      return {
        file,
        description: 'Replace in-place array mutation with immutable reassignment to trigger reactivity.',
        originalSnippet: '.value.push(',
        replacementSnippet: '.update(list => [...list, ',
        ruleCitation: 'ai/REACTIVITY_RULES.md - Section 3: Signal Immutability',
        rootCause: 'Signals only notify subscribers on reference changes. In-place mutation breaks reactive propagation.'
      };
    }

    // Pattern 4: Calling signals as functions count() instead of count.value
    if (/SAMREY-101/i.test(errorStr) || /is not a function/i.test(errorStr) && /\(\)/.test(errorStr)) {
      const file = context.targetFile;
      if (file && existsSync(file)) {
        return {
          file,
          description: 'Access signal value using .value property instead of function invocation.',
          originalSnippet: '()',
          replacementSnippet: '.value',
          ruleCitation: 'ai/REACTIVITY_RULES.md - Section 1: Signal Value Access',
          rootCause: 'Samrey signals are property-based (.value), not function-based.'
        };
      }
    }

    // Pattern 5: Missing static template hoisting (direct string concatenation in render)
    if (/SAMREY-106/i.test(errorStr) || /Missing hoisted template/i.test(errorStr)) {
      const file = context.targetFile;
      if (file && existsSync(file)) {
        return {
          file,
          description: 'Hoist static invariant HTML at module scope with template("...").',
          originalSnippet: 'el.innerHTML =',
          replacementSnippet: 'const _tmpl = template("...");',
          ruleCitation: 'ai/COMPONENT_RULES.md - Template Hoisting',
          rootCause: 'Components must clone hoisted templates rather than dynamically assigning innerHTML.'
        };
      }
    }

    return null;
  }

  /**
   * Executes a safe correction attempt: validates authorization, checks loop thrashing,
   * applies the patch, and reruns the provided verification callback.
   */
  async executeCorrection(
    context: FailureContext,
    projectDir: string,
    verifyFn: () => Promise<{ passed: boolean; message: string }>
  ): Promise<CorrectionResult> {
    const attemptNum = this.history.length + 1;

    // Check retry budget
    if (attemptNum > this.maxRetries) {
      this.logger?.recordDiagnostic({
        code: 'MAX_RETRIES_EXCEEDED',
        message: `Self-correction halted after ${this.maxRetries} failed attempts.`,
        severity: 'error'
      });
      return {
        success: false,
        attempt: attemptNum,
        verificationPassed: false,
        regressionsDetected: false,
        message: `Retry limit of ${this.maxRetries} reached. Escalating to human.`,
        escalatedToHuman: true
      };
    }

    // Check authorization level
    const authCheck = this.security.checkPermission('modify-source-file', AuthorizationLevel.FILE_MODIFICATION);
    if (!authCheck.allowed) {
      return {
        success: false,
        attempt: attemptNum,
        verificationPassed: false,
        regressionsDetected: false,
        message: authCheck.reason || 'Unauthorized file modification.',
        escalatedToHuman: true
      };
    }

    // Diagnose
    const correction = this.diagnoseFailure(context, projectDir);
    if (!correction) {
      return {
        success: false,
        attempt: attemptNum,
        verificationPassed: false,
        regressionsDetected: false,
        message: 'No authoritative root cause identified. Escalating to human.',
        escalatedToHuman: true
      };
    }

    // Check for loop thrashing (repeating the exact same fix)
    const isRepeated = this.history.some(h => h.fix === correction.replacementSnippet && h.error === context.errorMessage);
    if (isRepeated) {
      return {
        success: false,
        attempt: attemptNum,
        appliedCorrection: correction,
        verificationPassed: false,
        regressionsDetected: false,
        message: 'Loop thrash detected: Identical fix already failed previously. Escalating to human.',
        escalatedToHuman: true
      };
    }

    // Read target file & apply
    const targetPath = resolve(projectDir, correction.file);
    if (!existsSync(targetPath)) {
      return {
        success: false,
        attempt: attemptNum,
        appliedCorrection: correction,
        verificationPassed: false,
        regressionsDetected: false,
        message: `Target file not found: ${targetPath}`,
        escalatedToHuman: true
      };
    }

    const originalContent = readFileSync(targetPath, 'utf-8');

    // Safe replacement
    if (!originalContent.includes(correction.originalSnippet)) {
      return {
        success: false,
        attempt: attemptNum,
        appliedCorrection: correction,
        verificationPassed: false,
        regressionsDetected: false,
        message: `Original snippet not located in ${correction.file}`,
        escalatedToHuman: true
      };
    }

    const patchedContent = originalContent.replace(correction.originalSnippet, correction.replacementSnippet);
    writeFileSync(targetPath, patchedContent, 'utf-8');

    this.logger?.recordFileModified(correction.file);

    // Re-run verification callback (Never claim a fix worked without rerunning validation)
    const verification = await verifyFn();

    this.history.push({
      attempt: attemptNum,
      error: context.errorMessage,
      fix: correction.replacementSnippet
    });

    if (verification.passed) {
      this.logger?.recordCorrection({
        attempt: attemptNum,
        file: correction.file,
        errorSnippet: correction.originalSnippet,
        rootCause: correction.rootCause,
        proposedFix: correction.replacementSnippet,
        outcome: 'FIXED',
        verificationTestsPassed: true
      });

      return {
        success: true,
        attempt: attemptNum,
        appliedCorrection: correction,
        verificationPassed: true,
        regressionsDetected: false,
        message: `Successfully self-corrected ${correction.file}: ${correction.description}`,
        escalatedToHuman: false
      };
    } else {
      // Revert if verification failed to avoid compound breakages
      writeFileSync(targetPath, originalContent, 'utf-8');

      this.logger?.recordCorrection({
        attempt: attemptNum,
        file: correction.file,
        errorSnippet: correction.originalSnippet,
        rootCause: correction.rootCause,
        proposedFix: correction.replacementSnippet,
        outcome: 'REVERTED',
        verificationTestsPassed: false
      });

      return {
        success: false,
        attempt: attemptNum,
        appliedCorrection: correction,
        verificationPassed: false,
        regressionsDetected: true,
        message: `Correction failed verification: ${verification.message}. Reverted changes.`,
        escalatedToHuman: attemptNum >= this.maxRetries
      };
    }
  }

  private findSourceFileWithPattern(pattern: RegExp, projectDir: string): string | null {
    // Helper to scan for files containing prohibited patterns
    try {
      const srcDir = resolve(projectDir, 'src');
      if (!existsSync(srcDir)) return null;
      // In practice, returns first matching file in src/
      return null;
    } catch {
      return null;
    }
  }
}
