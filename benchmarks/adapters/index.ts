/**
 * @license Apache-2.0
 * @samrey/monorepo - Multi-Model Adapters Registry
 */

export * from './base-adapter.js';
export * from './openai-adapter.js';
export * from './claude-adapter.js';
export * from './gemini-adapter.js';
export * from './grok-adapter.js';
export * from './generic-cli-adapter.js';

import { AgentAdapter } from './base-adapter.js';
import { BENCHMARK_MODELS } from '../models/model-registry.js';
import { OpenAiAdapter } from './openai-adapter.js';
import { ClaudeAdapter } from './claude-adapter.js';
import { GeminiAdapter } from './gemini-adapter.js';
import { GrokAdapter } from './grok-adapter.js';
import { GenericCliAdapter } from './generic-cli-adapter.js';

export function createAdapter(modelId: string): AgentAdapter {
  const profile = BENCHMARK_MODELS[modelId];
  if (!profile) {
    throw new Error(`Unknown benchmark model "${modelId}". Available: ${Object.keys(BENCHMARK_MODELS).join(', ')}`);
  }

  switch (profile.provider) {
    case 'openai':
      return new OpenAiAdapter(profile);
    case 'anthropic':
      return new ClaudeAdapter(profile);
    case 'google':
      return new GeminiAdapter(profile);
    case 'xai':
      return new GrokAdapter(profile);
    case 'generic':
      return new GenericCliAdapter(profile);
  }
}
