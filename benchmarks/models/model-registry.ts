/**
 * @license Apache-2.0
 * @samrey/monorepo - Multi-Model Benchmark Model Registry & Pinned Configs
 */

export interface ModelProfile {
  id: string;
  name: string;
  provider: 'openai' | 'anthropic' | 'google' | 'xai' | 'generic';
  pinnedVersion: string;
  contextWindow: number;
  costPer1kInputTokens: number;
  costPer1kOutputTokens: number;
  timeoutMs: number;
  supportsMcp: boolean;
  requiredEnvVar: string;
}

export const BENCHMARK_MODELS: Record<string, ModelProfile> = {
  'gpt-4o': {
    id: 'gpt-4o',
    name: 'OpenAI GPT-4o',
    provider: 'openai',
    pinnedVersion: 'gpt-4o-2024-08-06',
    contextWindow: 128000,
    costPer1kInputTokens: 0.0025,
    costPer1kOutputTokens: 0.010,
    timeoutMs: 60000,
    supportsMcp: true,
    requiredEnvVar: 'OPENAI_API_KEY'
  },
  'claude-3-5-sonnet': {
    id: 'claude-3-5-sonnet',
    name: 'Anthropic Claude 3.5 Sonnet',
    provider: 'anthropic',
    pinnedVersion: 'claude-3-5-sonnet-20241022',
    contextWindow: 200000,
    costPer1kInputTokens: 0.003,
    costPer1kOutputTokens: 0.015,
    timeoutMs: 60000,
    supportsMcp: true,
    requiredEnvVar: 'ANTHROPIC_API_KEY'
  },
  'gemini-1-5-pro': {
    id: 'gemini-1-5-pro',
    name: 'Google Gemini 1.5 Pro',
    provider: 'google',
    pinnedVersion: 'gemini-1.5-pro-002',
    contextWindow: 1000000,
    costPer1kInputTokens: 0.00125,
    costPer1kOutputTokens: 0.005,
    timeoutMs: 60000,
    supportsMcp: true,
    requiredEnvVar: 'GEMINI_API_KEY'
  },
  'grok-beta': {
    id: 'grok-beta',
    name: 'xAI Grok',
    provider: 'xai',
    pinnedVersion: 'grok-beta',
    contextWindow: 131072,
    costPer1kInputTokens: 0.005,
    costPer1kOutputTokens: 0.015,
    timeoutMs: 60000,
    supportsMcp: false,
    requiredEnvVar: 'XAI_API_KEY'
  },
  'generic-cli': {
    id: 'generic-cli',
    name: 'Generic Agent CLI',
    provider: 'generic',
    pinnedVersion: 'local-cli-v1',
    contextWindow: 64000,
    costPer1kInputTokens: 0.0,
    costPer1kOutputTokens: 0.0,
    timeoutMs: 90000,
    supportsMcp: true,
    requiredEnvVar: 'SAMREY_AGENT_CMD'
  }
};
