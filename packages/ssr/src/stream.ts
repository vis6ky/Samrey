/**
 * @license Apache-2.0
 * @aether/ssr - HTML String & Streaming Renderer
 */

import { serializeStateForHydration } from './serializer.js';
import { getDelegatedEventScript } from './hydration.js';

export interface RenderToStringOptions {
  state?: unknown;
  title?: string;
}

export function renderToString(htmlContent: string, options: RenderToStringOptions = {}): string {
  const stateScript = options.state ? serializeStateForHydration(options.state) : '';
  const delegatorScript = getDelegatedEventScript();

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>${options.title || 'Aether Application'}</title>
  ${delegatorScript}
</head>
<body>
  <div id="app">${htmlContent}</div>
  ${stateScript}
</body>
</html>`;
}
