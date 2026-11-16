/**
 * @license Apache-2.0
 * Samrey Framework — Autonomous Development Observability & Execution Trace
 */

import { writeFileSync, mkdirSync, existsSync, readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { SecurityPolicy } from './authorization.js';

export type WorkflowStage =
  | 'DISCOVER'
  | 'ANALYZE'
  | 'PLAN'
  | 'GENERATE'
  | 'VALIDATE'
  | 'BUILD'
  | 'TEST'
  | 'DIAGNOSE'
  | 'CORRECT'
  | 'RETEST'
  | 'VERIFY'
  | 'REPORT';

export interface TraceStep {
  stage: WorkflowStage;
  timestamp: string;
  durationMs: number;
  status: 'SUCCESS' | 'FAILED' | 'SKIPPED' | 'PENDING';
  summary: string;
  metadata?: Record<string, unknown>;
}

export interface TraceDiagnostic {
  code: string;
  message: string;
  file?: string;
  line?: number;
  column?: number;
  severity: 'error' | 'warning' | 'info';
  rootCause?: string;
}

export interface TraceCorrection {
  attempt: number;
  timestamp: string;
  file: string;
  errorSnippet: string;
  rootCause: string;
  proposedFix: string;
  outcome: 'FIXED' | 'REVERTED' | 'FAILED';
  verificationTestsPassed: boolean;
}

export interface ExecutionTrace {
  taskId: string;
  agentId: string;
  modelId?: string;
  executionMode: 'autonomous' | 'supervised' | 'interactive';
  status: 'IN_PROGRESS' | 'COMPLETED' | 'FAILED' | 'ESCALATED';
  startTime: string;
  endTime?: string;
  totalDurationMs?: number;
  stepsCompleted: TraceStep[];
  filesCreated: string[];
  filesModified: string[];
  diagnostics: TraceDiagnostic[];
  correctionAttempts: TraceCorrection[];
  buildResults?: {
    success: boolean;
    durationMs: number;
    errors: string[];
  };
  testResults?: {
    total: number;
    passed: number;
    failed: number;
    durationMs: number;
    failures: { name: string; error: string }[];
  };
  humanInterventions: number;
}

export class TraceLogger {
  private trace: ExecutionTrace;
  private security: SecurityPolicy;
  private outputPath?: string;

  constructor(
    taskId: string,
    agentId = 'autonomous-agent',
    modelId?: string,
    mode: 'autonomous' | 'supervised' | 'interactive' = 'autonomous',
    outputPath?: string
  ) {
    this.security = new SecurityPolicy();
    this.outputPath = outputPath;
    this.trace = {
      taskId,
      agentId,
      modelId,
      executionMode: mode,
      status: 'IN_PROGRESS',
      startTime: new Date().toISOString(),
      stepsCompleted: [],
      filesCreated: [],
      filesModified: [],
      diagnostics: [],
      correctionAttempts: [],
      humanInterventions: 0
    };
  }

  recordStep(
    stage: WorkflowStage,
    durationMs: number,
    status: 'SUCCESS' | 'FAILED' | 'SKIPPED' | 'PENDING',
    summary: string,
    metadata?: Record<string, unknown>
  ): void {
    this.trace.stepsCompleted.push({
      stage,
      timestamp: new Date().toISOString(),
      durationMs,
      status,
      summary: this.security.sanitizeOutput(summary),
      metadata
    });
    this.persist();
  }

  recordFileCreated(filePath: string): void {
    if (!this.trace.filesCreated.includes(filePath)) {
      this.trace.filesCreated.push(filePath);
      this.persist();
    }
  }

  recordFileModified(filePath: string): void {
    if (!this.trace.filesModified.includes(filePath)) {
      this.trace.filesModified.push(filePath);
      this.persist();
    }
  }

  recordDiagnostic(diagnostic: TraceDiagnostic): void {
    this.trace.diagnostics.push({
      ...diagnostic,
      message: this.security.sanitizeOutput(diagnostic.message),
      rootCause: diagnostic.rootCause ? this.security.sanitizeOutput(diagnostic.rootCause) : undefined
    });
    this.persist();
  }

  recordCorrection(correction: Omit<TraceCorrection, 'timestamp'>): void {
    this.trace.correctionAttempts.push({
      ...correction,
      timestamp: new Date().toISOString(),
      errorSnippet: this.security.sanitizeOutput(correction.errorSnippet),
      proposedFix: this.security.sanitizeOutput(correction.proposedFix)
    });
    this.persist();
  }

  recordBuild(success: boolean, durationMs: number, errors: string[] = []): void {
    this.trace.buildResults = {
      success,
      durationMs,
      errors: errors.map(e => this.security.sanitizeOutput(e))
    };
    this.persist();
  }

  recordTests(
    total: number,
    passed: number,
    failed: number,
    durationMs: number,
    failures: { name: string; error: string }[] = []
  ): void {
    this.trace.testResults = {
      total,
      passed,
      failed,
      durationMs,
      failures: failures.map(f => ({
        name: f.name,
        error: this.security.sanitizeOutput(f.error)
      }))
    };
    this.persist();
  }

  recordHumanIntervention(): void {
    this.trace.humanInterventions++;
    this.persist();
  }

  complete(status: 'COMPLETED' | 'FAILED' | 'ESCALATED' = 'COMPLETED'): ExecutionTrace {
    this.trace.status = status;
    this.trace.endTime = new Date().toISOString();
    const start = new Date(this.trace.startTime).getTime();
    const end = new Date(this.trace.endTime).getTime();
    this.trace.totalDurationMs = Math.max(0, end - start);
    this.persist();
    return this.getTrace();
  }

  getTrace(): ExecutionTrace {
    return JSON.parse(JSON.stringify(this.trace));
  }

  private persist(): void {
    if (!this.outputPath) return;
    try {
      const fullPath = resolve(process.cwd(), this.outputPath);
      const dir = dirname(fullPath);
      if (!existsSync(dir)) {
        mkdirSync(dir, { recursive: true });
      }
      writeFileSync(fullPath, JSON.stringify(this.trace, null, 2), 'utf-8');
    } catch {
      // Non-fatal if filesystem persistence fails
    }
  }
}
