/**
 * @license Apache-2.0
 * @samrey/monorepo - Generic Agent CLI Integration Adapter
 */

import { spawn } from 'node:child_process';
import { AgentAdapter, ChallengeTask, AdapterGenerationResult } from './base-adapter.js';
import { ModelProfile } from '../models/model-registry.js';

export class GenericCliAdapter extends AgentAdapter {
  constructor(profile: ModelProfile) {
    super(profile);
  }

  isConfigured(): boolean {
    return Boolean(process.env.SAMREY_AGENT_CMD && process.env.SAMREY_AGENT_CMD.trim().length > 0);
  }

  getUnconfiguredReason(): string {
    return 'SAMREY_AGENT_CMD environment variable is not configured.';
  }

  async executeChallenge(
    challenge: ChallengeTask,
    fixtureDir: string
  ): Promise<AdapterGenerationResult> {
    if (!this.isConfigured()) {
      return {
        status: 'NOT_RUN',
        modelId: this.profile.id,
        notRunReason: this.getUnconfiguredReason(),
        generatedFiles: {},
        executionTimeMs: 0
      };
    }

    const cmdStr = process.env.SAMREY_AGENT_CMD!;
    const parts = cmdStr.split(' ');
    const bin = parts[0];
    const args = parts.slice(1);
    const startTime = Date.now();

    return new Promise((resolve) => {
      const prompt = `Challenge [${challenge.id}: ${challenge.name}]\nTask: ${challenge.prompt}\nFiles: ${challenge.expectedFiles.join(', ')}`;

      const child = spawn(bin, [...args, prompt], {
        cwd: fixtureDir,
        env: { ...process.env, SAMREY_CHALLENGE_ID: String(challenge.id) },
        stdio: ['pipe', 'pipe', 'pipe']
      });

      let stdout = '';
      let stderr = '';

      child.stdout.on('data', (d) => { stdout += d.toString(); });
      child.stderr.on('data', (d) => { stderr += d.toString(); });

      const timer = setTimeout(() => {
        try { child.kill('SIGKILL'); } catch {}
        resolve({
          status: 'ERROR',
          modelId: this.profile.id,
          error: `Generic CLI command timed out after ${this.profile.timeoutMs}ms`,
          generatedFiles: {},
          executionTimeMs: Date.now() - startTime
        });
      }, this.profile.timeoutMs);

      child.on('close', (code) => {
        clearTimeout(timer);
        if (code !== 0) {
          resolve({
            status: 'ERROR',
            modelId: this.profile.id,
            error: `Generic CLI exited with code ${code}: ${stderr}`,
            generatedFiles: {},
            executionTimeMs: Date.now() - startTime
          });
        } else {
          resolve({
            status: 'SUCCESS',
            modelId: this.profile.id,
            generatedFiles: { [challenge.expectedFiles[0] || 'Solution.ts']: stdout },
            executionTimeMs: Date.now() - startTime,
            rawResponse: stdout
          });
        }
      });
    });
  }
}
