/**
 * @license Apache-2.0
 * @samrey/monorepo - Multi-Model Benchmark Agent Adapter Interface
 */

import { ModelProfile } from '../models/model-registry.js';

export interface ChallengeTask {
  id: number;
  category: string;
  name: string;
  prompt: string;
  expectedFiles: string[];
  referenceCode?: Record<string, string>;
  testCode: string;
}

export interface AdapterGenerationResult {
  status: 'SUCCESS' | 'ERROR' | 'NOT_RUN';
  modelId: string;
  notRunReason?: string;
  generatedFiles: Record<string, string>;
  executionTimeMs: number;
  tokenUsage?: {
    inputTokens: number;
    outputTokens: number;
  };
  estimatedCostUsd?: number;
  rawResponse?: string;
  error?: string;
}

export abstract class AgentAdapter {
  constructor(public readonly profile: ModelProfile) {}

  abstract isConfigured(): boolean;
  abstract getUnconfiguredReason(): string;
  abstract executeChallenge(
    challenge: ChallengeTask,
    fixtureDir: string
  ): Promise<AdapterGenerationResult>;

  protected calculateCost(inputTokens: number, outputTokens: number): number {
    const inputCost = (inputTokens / 1000) * this.profile.costPer1kInputTokens;
    const outputCost = (outputTokens / 1000) * this.profile.costPer1kOutputTokens;
    return Number((inputCost + outputCost).toFixed(5));
  }
}
