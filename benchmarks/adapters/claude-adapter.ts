/**
 * @license Apache-2.0
 * @samrey/monorepo - Anthropic Claude / Claude Code Agent Adapter
 */

import { AgentAdapter, ChallengeTask, AdapterGenerationResult } from './base-adapter.js';
import { ModelProfile } from '../models/model-registry.js';

export class ClaudeAdapter extends AgentAdapter {
  constructor(profile: ModelProfile) {
    super(profile);
  }

  isConfigured(): boolean {
    return Boolean(process.env.ANTHROPIC_API_KEY && process.env.ANTHROPIC_API_KEY.trim().length > 0);
  }

  getUnconfiguredReason(): string {
    return 'ANTHROPIC_API_KEY environment variable is not configured.';
  }

  async executeChallenge(
    challenge: ChallengeTask,
    _fixtureDir: string
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

    const apiKey = process.env.ANTHROPIC_API_KEY!;
    const startTime = Date.now();

    try {
      const systemPrompt = `You are an expert autonomous software engineer developing with the Samrey framework.
Samrey has ZERO Virtual DOM. Components run EXACTLY ONCE.
Use pure signals (@samrey/reactivity) and hoisted static templates (@samrey/runtime).
Never use React hooks (useState, useEffect).
Never write <Show> or <For> as HTML tags.
Emit only code or markdown code blocks with file path headers.`;

      const userPrompt = `Challenge [${challenge.id}: ${challenge.name}]
Category: ${challenge.category}
Task: ${challenge.prompt}
Required files to produce: ${challenge.expectedFiles.join(', ')}`;

      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model: this.profile.pinnedVersion,
          max_tokens: 4096,
          system: systemPrompt,
          messages: [{ role: 'user', content: userPrompt }],
          temperature: 0.1
        })
      });

      if (!response.ok) {
        const errText = await response.text();
        return {
          status: 'ERROR',
          modelId: this.profile.id,
          error: `Anthropic API error (${response.status}): ${errText}`,
          generatedFiles: {},
          executionTimeMs: Date.now() - startTime
        };
      }

      const data = await response.json() as any;
      const textBlock = data.content?.find((c: any) => c.type === 'text');
      const content = textBlock?.text || '';
      const inTokens = data.usage?.input_tokens || 0;
      const outTokens = data.usage?.output_tokens || 0;

      const generatedFiles = this.extractFilesFromResponse(content, challenge.expectedFiles);

      return {
        status: 'SUCCESS',
        modelId: this.profile.id,
        generatedFiles,
        executionTimeMs: Date.now() - startTime,
        tokenUsage: { inputTokens: inTokens, outputTokens: outTokens },
        estimatedCostUsd: this.calculateCost(inTokens, outTokens),
        rawResponse: content
      };
    } catch (err: any) {
      return {
        status: 'ERROR',
        modelId: this.profile.id,
        error: err?.message || String(err),
        generatedFiles: {},
        executionTimeMs: Date.now() - startTime
      };
    }
  }

  private extractFilesFromResponse(content: string, expectedFiles: string[]): Record<string, string> {
    const files: Record<string, string> = {};
    const codeBlockRegex = /```(?:[a-zA-Z0-9_\-]+)?(?::([^\n]+))?\n([\s\S]*?)```/g;
    let match: RegExpExecArray | null;

    while ((match = codeBlockRegex.exec(content)) !== null) {
      const header = match[1]?.trim() || '';
      const code = match[2];
      if (header) {
        files[header] = code;
      }
    }

    if (Object.keys(files).length === 0 && expectedFiles.length > 0) {
      const singleBlock = content.match(/```(?:ts|tsx|js|javascript)?\n([\s\S]*?)```/);
      if (singleBlock) {
        files[expectedFiles[0]] = singleBlock[1];
      }
    }

    return files;
  }
}
