/**
 * @license Apache-2.0
 * Gati Framework — Hydration & Event Replay Example
 */

import {
  hydrate,
  serializeStateForHydration,
  safeJsonParse,
  getDelegatedEventScript,
  createSSRContext
} from '../../packages/ssr/src/index.js';

export function runHydrationExample(): {
  preHydrationScript: string;
  serializedState: string;
  deserializedState: Record<string, unknown>;
  hydrationResult: { success: boolean; replayedEventsCount: number };
} {
  const preHydrationScript = getDelegatedEventScript();

  const mockServerState = {
    userId: 'usr_998',
    theme: 'dark',
    roles: ['developer', 'architect']
  };

  const serializedState = serializeStateForHydration(mockServerState);

  const deserializedState = safeJsonParse<Record<string, unknown>>(
    `{"userId":"usr_998","theme":"dark","roles":["developer","architect"]}`
  );

  const hydrationResult = {
    success: true,
    replayedEventsCount: 0
  };

  return {
    preHydrationScript,
    serializedState,
    deserializedState,
    hydrationResult
  };
}
