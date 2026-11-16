/**
 * @license Apache-2.0
 * Samrey Framework — Generic Authenticated Coding Agent Workflow Adapter
 * 
 * Supports provider-independent agent evaluation without requiring direct external API keys:
 * - Mode A: Automated CLI execution (using locally authenticated developer CLIs)
 * - Mode B: Interactive IDE Agent execution (Antigravity, Gemini in IDE, Claude Code, Codex)
 */

import { existsSync, readFileSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { execSync } from 'node:child_process';

export type ExecutionCategory = 
  | 'fully-automated-cli'
  | 'authenticated-ide-agent'
  | 'interactive-human-assisted';

export interface AgentContext {
  agentName: string;
  modelIdentifier?: string;
  category: ExecutionCategory;
  humanInterventions?: number;
  correctionCycles?: number;
  notes?: string;
}

export interface TaskDefinition {
  id: string;
  number: string;
  title: string;
  taskFile: string;
  fixtureDir: string;
  referenceFile: string;
}

export const BENCHMARK_TASKS: Record<string, TaskDefinition> = {
  '01': {
    id: 'TASK-01-COUNTER',
    number: '01',
    title: 'Build a Reactive Counter',
    taskFile: 'benchmarks/interactive/tasks/01-reactive-counter.md',
    fixtureDir: 'benchmarks/interactive/fixtures/01-reactive-counter',
    referenceFile: 'benchmarks/interactive/evaluation/reference-solutions/01-counter.ts'
  },
  '02': {
    id: 'TASK-02-COMPONENTS',
    number: '02',
    title: 'Create Reusable Samrey Components',
    taskFile: 'benchmarks/interactive/tasks/02-reusable-components.md',
    fixtureDir: 'benchmarks/interactive/fixtures/02-reusable-components',
    referenceFile: 'benchmarks/interactive/evaluation/reference-solutions/02-components.ts'
  },
  '03': {
    id: 'TASK-03-ROUTING',
    number: '03',
    title: 'Build a Routed Dashboard',
    taskFile: 'benchmarks/interactive/tasks/03-routed-dashboard.md',
    fixtureDir: 'benchmarks/interactive/fixtures/03-routed-dashboard',
    referenceFile: 'benchmarks/interactive/evaluation/reference-solutions/03-routing.ts'
  },
  '04': {
    id: 'TASK-04-FORMS',
    number: '04',
    title: 'Implement Validated Forms',
    taskFile: 'benchmarks/interactive/tasks/04-validated-forms.md',
    fixtureDir: 'benchmarks/interactive/fixtures/04-validated-forms',
    referenceFile: 'benchmarks/interactive/evaluation/reference-solutions/04-forms.ts'
  },
  '05': {
    id: 'TASK-05-DEBUG',
    number: '05',
    title: 'Debug an Intentionally Broken Application',
    taskFile: 'benchmarks/interactive/tasks/05-debug-broken-app.md',
    fixtureDir: 'benchmarks/interactive/fixtures/05-debug-broken-app',
    referenceFile: 'benchmarks/interactive/evaluation/reference-solutions/05-debug.ts'
  }
};

/**
 * Prepares task prompt for interactive IDE agent submission (Mode B - Antigravity / IDE).
 */
export function prepareAgentPrompt(taskNumber: string): string {
  const task = BENCHMARK_TASKS[taskNumber];
  if (!task) {
    throw new Error(`Unknown task number: ${taskNumber}. Valid: 01, 02, 03, 04, 05`);
  }

  const rootDir = process.cwd();
  const taskFilePath = resolve(rootDir, task.taskFile);
  const taskContent = readFileSync(taskFilePath, 'utf-8');

  return `
[SAMREY AI AGENT BENCHMARK — TASK ${task.number}]
Task ID: ${task.id}
Title: ${task.title}
Target Directory: ${task.fixtureDir}/

You are an expert Samrey framework engineer. Complete the task defined below.
Adhere strictly to Samrey framework rules:
- Zero VDOM: Components run once. Hoist static HTML with template('...').
- Fine-grained reactivity: Use signal(), computed(), effect() from @samrey/reactivity.
- Surgical DOM bindings: Use bindText, bindAttr, on from @samrey/runtime.
- Control flow: Use Show() and For() from @samrey/runtime. NEVER write <Show> or <For> as HTML tags.
- Prohibited: Never use React hooks (useState, useEffect, useRef, etc.).

---
${taskContent}
---
Please write the complete production implementation directly inside the fixture directory:
${task.fixtureDir}
`.trim();
}

/**
 * Detects locally installed and authenticated developer CLIs (Mode A - Automated CLI).
 */
export function detectAuthenticatedClis(): { name: string; command: string; available: boolean }[] {
  const candidates = [
    { name: 'Gemini CLI', command: 'gemini --version' },
    { name: 'Claude Code', command: 'claude --version' },
    { name: 'GitHub Copilot CLI', command: 'gh copilot --version' }
  ];

  return candidates.map(c => {
    try {
      execSync(c.command, { stdio: 'ignore' });
      return { ...c, available: true };
    } catch {
      return { ...c, available: false };
    }
  });
}
