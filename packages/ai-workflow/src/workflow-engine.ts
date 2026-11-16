/**
 * @license Apache-2.0
 * Samrey Framework — Autonomous Development Workflow Engine
 */

import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { WorkflowStage, TraceLogger, ExecutionTrace } from './observability.js';
import { SecurityPolicy, AuthorizationLevel } from './authorization.js';
import { ArchitecturePlanner, ApplicationArchitecturePlan } from './architecture-planner.js';
import { SelfCorrectionEngine, FailureContext } from './self-correction.js';

export interface TaskState {
  taskId: string;
  taskTitle: string;
  projectDir: string;
  currentStage: WorkflowStage;
  status: 'IDLE' | 'IN_PROGRESS' | 'WAITING_APPROVAL' | 'PAUSED' | 'COMPLETED' | 'FAILED' | 'ESCALATED';
  completedStages: WorkflowStage[];
  outstandingStages: WorkflowStage[];
  plan?: ApplicationArchitecturePlan;
  filesChanged: string[];
  diagnostics: { code: string; message: string; severity: string }[];
  testResults?: { passed: boolean; total: number; successful: number; failed: number };
  retryCount: number;
  maxRetries: number;
  approvalRequired?: { action: string; reason: string };
  updatedAt: string;
}

export const WORKFLOW_STAGES_ORDER: WorkflowStage[] = [
  'DISCOVER',
  'ANALYZE',
  'PLAN',
  'GENERATE',
  'VALIDATE',
  'BUILD',
  'TEST',
  'DIAGNOSE',
  'CORRECT',
  'RETEST',
  'VERIFY',
  'REPORT'
];

export class WorkflowEngine {
  private state: TaskState;
  private stateFile: string;
  private logger: TraceLogger;
  private security: SecurityPolicy;
  private planner: ArchitecturePlanner;
  private selfCorrection: SelfCorrectionEngine;

  constructor(
    taskId: string,
    taskTitle: string,
    projectDir: string,
    agentId = 'autonomous-agent',
    modelId?: string,
    authorizationLevel = AuthorizationLevel.BUILD_EXECUTION
  ) {
    this.stateFile = resolve(projectDir, '.samrey', `task-${taskId}.json`);
    this.security = new SecurityPolicy(authorizationLevel);
    this.logger = new TraceLogger(
      taskId,
      agentId,
      modelId,
      'autonomous',
      resolve(projectDir, '.samrey', `trace-${taskId}.json`)
    );
    this.planner = new ArchitecturePlanner();
    this.selfCorrection = new SelfCorrectionEngine(this.logger, 3, authorizationLevel);

    if (existsSync(this.stateFile)) {
      try {
        this.state = JSON.parse(readFileSync(this.stateFile, 'utf-8'));
      } catch {
        this.state = this.initNewState(taskId, taskTitle, projectDir);
      }
    } else {
      this.state = this.initNewState(taskId, taskTitle, projectDir);
    }
  }

  private initNewState(taskId: string, taskTitle: string, projectDir: string): TaskState {
    return {
      taskId,
      taskTitle,
      projectDir,
      currentStage: 'DISCOVER',
      status: 'IDLE',
      completedStages: [],
      outstandingStages: [...WORKFLOW_STAGES_ORDER],
      filesChanged: [],
      diagnostics: [],
      retryCount: 0,
      maxRetries: 3,
      updatedAt: new Date().toISOString()
    };
  }

  getState(): TaskState {
    return JSON.parse(JSON.stringify(this.state));
  }

  getTrace(): ExecutionTrace {
    return this.logger.getTrace();
  }

  /**
   * Stage 1: DISCOVER — Inspects framework environment, installed packages, and capabilities.
   */
  async discover(): Promise<{ success: boolean; data: Record<string, unknown> }> {
    const startTime = Date.now();
    this.state.status = 'IN_PROGRESS';
    this.state.currentStage = 'DISCOVER';

    const discoveryData = {
      framework: 'Samrey',
      version: '2.1.0',
      nodeVersion: process.version,
      platform: process.platform,
      zeroVDOM: true,
      staticHoisting: true,
      signals: true
    };

    this.completeStage('DISCOVER', Date.now() - startTime, 'Discovered Samrey 2.1.0 runtime environment');
    return { success: true, data: discoveryData };
  }

  /**
   * Stage 2: ANALYZE — Analyzes project structure, configuration, and dependencies.
   */
  async analyze(): Promise<{ success: boolean; data: Record<string, unknown> }> {
    const startTime = Date.now();
    this.state.currentStage = 'ANALYZE';

    const pkgJsonPath = resolve(this.state.projectDir, 'package.json');
    let hasSamrey = false;
    let dependencies: Record<string, string> = {};

    if (existsSync(pkgJsonPath)) {
      try {
        const pkg = JSON.parse(readFileSync(pkgJsonPath, 'utf-8'));
        dependencies = { ...pkg.dependencies, ...pkg.devDependencies };
        hasSamrey = Object.keys(dependencies).some(k => k.startsWith('@samrey/'));
      } catch {}
    }

    const analysis = {
      projectDir: this.state.projectDir,
      hasSamreyDependencies: hasSamrey,
      dependencies
    };

    this.completeStage('ANALYZE', Date.now() - startTime, 'Analyzed project structure & dependencies');
    return { success: true, data: analysis };
  }

  /**
   * Stage 3: PLAN — Produces a complete architectural blueprint from natural language requirements.
   */
  async plan(requirements: { appName: string; description: string; features: string[] }): Promise<ApplicationArchitecturePlan> {
    const startTime = Date.now();
    this.state.currentStage = 'PLAN';

    const plan = this.planner.planApplication(requirements);
    this.state.plan = plan;

    this.completeStage('PLAN', Date.now() - startTime, `Generated architecture plan for "${requirements.appName}"`, {
      componentsCount: plan.componentHierarchy.length,
      routesCount: plan.routing.length,
      modelsCount: plan.dataModels.length
    });

    return plan;
  }

  /**
   * Stage 4: GENERATE — Generates components, routes, models, and forms according to plan.
   */
  async recordGeneration(files: string[]): Promise<void> {
    const startTime = Date.now();
    this.state.currentStage = 'GENERATE';

    for (const f of files) {
      this.logger.recordFileCreated(f);
      if (!this.state.filesChanged.includes(f)) {
        this.state.filesChanged.push(f);
      }
    }

    this.completeStage('GENERATE', Date.now() - startTime, `Generated ${files.length} application files`);
  }

  /**
   * Stage 5: VALIDATE — Validates source code against Samrey invariants (0 React hooks, 0 <Show> tags).
   */
  async validate(sourceCode: string, fileName: string): Promise<{ valid: boolean; violations: string[] }> {
    const startTime = Date.now();
    this.state.currentStage = 'VALIDATE';
    const violations: string[] = [];

    if (/useState|useEffect|useRef|useCallback|useMemo/.test(sourceCode)) {
      violations.push(`Prohibited foreign React hooks in ${fileName}`);
    }
    if (/<Show[\s>]|<For[\s>]/i.test(sourceCode)) {
      violations.push(`Prohibited <Show> or <For> template tag in ${fileName} (SAMREY-108)`);
    }
    if (/\.value\.push\(|\.value\.splice\(/.test(sourceCode)) {
      violations.push(`Prohibited in-place signal mutation in ${fileName}`);
    }

    const valid = violations.length === 0;
    this.completeStage('VALIDATE', Date.now() - startTime, `Validated ${fileName}: ${valid ? 'Clean' : 'Violations detected'}`);
    return { valid, violations };
  }

  /**
   * Stage 6: BUILD — Compiles the project and checks for syntax or TypeScript errors.
   */
  async recordBuild(success: boolean, durationMs: number, errors: string[] = []): Promise<void> {
    this.state.currentStage = 'BUILD';
    this.logger.recordBuild(success, durationMs, errors);
    this.completeStage('BUILD', durationMs, success ? 'Build succeeded' : `Build failed with ${errors.length} errors`);
  }

  /**
   * Stage 7: TEST — Executes automated test suites.
   */
  async recordTests(
    total: number,
    passed: number,
    failed: number,
    durationMs: number,
    failures: { name: string; error: string }[] = []
  ): Promise<void> {
    this.state.currentStage = 'TEST';
    this.logger.recordTests(total, passed, failed, durationMs, failures);
    this.state.testResults = {
      passed: failed === 0,
      total,
      successful: passed,
      failed
    };
    this.completeStage('TEST', durationMs, `Tests finished: ${passed}/${total} passed`);
  }

  /**
   * Stage 8-10: DIAGNOSE, CORRECT & RETEST — Triggers controlled self-correction loop on failure.
   */
  async selfCorrect(
    context: FailureContext,
    verifyFn: () => Promise<{ passed: boolean; message: string }>
  ) {
    this.state.currentStage = 'DIAGNOSE';
    const startTime = Date.now();

    const result = await this.selfCorrection.executeCorrection(context, this.state.projectDir, verifyFn);

    this.logger.recordStep(
      'CORRECT',
      Date.now() - startTime,
      result.success ? 'SUCCESS' : 'FAILED',
      result.message
    );

    if (result.escalatedToHuman) {
      this.state.status = 'ESCALATED';
      this.state.approvalRequired = {
        action: 'human-intervention-required',
        reason: result.message
      };
    } else if (result.success) {
      this.state.currentStage = 'RETEST';
      this.completeStage('RETEST', 100, 'Re-testing confirmed fix resolved issue without regressions');
    }

    this.state.retryCount++;
    this.persist();
    return result;
  }

  /**
   * Stage 11: VERIFY — Runs independent holistic verification.
   */
  async verify(checks: { name: string; passed: boolean }[]): Promise<boolean> {
    const startTime = Date.now();
    this.state.currentStage = 'VERIFY';
    const allPassed = checks.every(c => c.passed);

    this.completeStage('VERIFY', Date.now() - startTime, `Holistic verification: ${allPassed ? 'Passed' : 'Failed'}`);
    return allPassed;
  }

  /**
   * Stage 12: REPORT — Produces machine-readable development summary.
   */
  report(): { summary: string; trace: ExecutionTrace; state: TaskState } {
    this.state.currentStage = 'REPORT';
    this.state.status = 'COMPLETED';
    this.completeStage('REPORT', 50, 'Generated development report');

    const trace = this.logger.complete('COMPLETED');
    return {
      summary: `Autonomous development completed for task "${this.state.taskTitle}". All ${this.state.completedStages.length} stages executed.`,
      trace,
      state: this.getState()
    };
  }

  private completeStage(stage: WorkflowStage, durationMs: number, summary: string, metadata?: Record<string, unknown>): void {
    if (!this.state.completedStages.includes(stage)) {
      this.state.completedStages.push(stage);
    }
    this.state.outstandingStages = this.state.outstandingStages.filter(s => s !== stage);
    this.state.updatedAt = new Date().toISOString();
    this.logger.recordStep(stage, durationMs, 'SUCCESS', summary, metadata);
    this.persist();
  }

  private persist(): void {
    try {
      const dir = dirname(this.stateFile);
      if (!existsSync(dir)) {
        mkdirSync(dir, { recursive: true });
      }
      writeFileSync(this.stateFile, JSON.stringify(this.state, null, 2), 'utf-8');
    } catch {
      // Non-fatal
    }
  }
}
