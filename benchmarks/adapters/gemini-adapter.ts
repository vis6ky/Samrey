/**
 * @license Apache-2.0
 * @samrey/monorepo - Google Gemini API / Gemini CLI Agent Adapter
 */

import { AgentAdapter, ChallengeTask, AdapterGenerationResult } from './base-adapter.js';
import { ModelProfile } from '../models/model-registry.js';

export class GeminiAdapter extends AgentAdapter {
  constructor(profile: ModelProfile) {
    super(profile);
  }

  isConfigured(): boolean {
    return Boolean(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.trim().length > 0);
  }

  getUnconfiguredReason(): string {
    return 'GEMINI_API_KEY environment variable is not configured.';
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

    const apiKey = process.env.GEMINI_API_KEY!;
    const startTime = Date.now();

    try {
      const systemInstruction = `You are an expert autonomous software engineer developing with the Samrey framework.
Samrey has ZERO Virtual DOM. Components run EXACTLY ONCE.
Use pure signals (@samrey/reactivity) and hoisted static templates (@samrey/runtime).
Never use React hooks (useState, useEffect).
Never write <Show> or <For> as HTML tags.
Emit only code or markdown code blocks with file path headers.`;

      const prompt = `Challenge [${challenge.id}: ${challenge.name}]
Category: ${challenge.category}
Task: ${challenge.prompt}
Required files to produce: ${challenge.expectedFiles.join(', ')}`;

      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${this.profile.pinnedVersion}:generateContent?key=${apiKey}`;

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          systemInstruction: { parts: [{ text: systemInstruction }] },
          generationConfig: { temperature: 0.1 }
        })
      });

      if (!response.ok) {
        const errText = await response.text();
        return {
          status: 'ERROR',
          modelId: this.profile.id,
          error: `Gemini API error (${response.status}): ${errText}`,
          generatedFiles: {},
          executionTimeMs: Date.now() - startTime
        };
      }

      const data = await response.json() as any;
      const candidate = data.candidates?.[0];
      const part = candidate?.content?.parts?.[0];
      const content = part?.text || '';
      const inTokens = data.usageMetadata?.promptTokenCount || 0;
      const outTokens = data.usageMetadata?.candidatesTokenCount || 0;

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
